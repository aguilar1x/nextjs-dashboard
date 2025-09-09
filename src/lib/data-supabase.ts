import { createServerClient } from '@/src/lib/supabase';
import {
  CustomerField,
  InvoiceForm,
  InvoicesTable,
  LatestInvoice,
  FormattedCustomersTable,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';

// Supabase-based equivalents. Keep original functions intact elsewhere and adopt these gradually.

export async function fetchRevenueSupabase(): Promise<Revenue[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase.from('revenue').select('*');
  if (error) {
    console.error('Supabase Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
  return (data as Revenue[]) ?? [];
}

export async function fetchLatestInvoicesSupabase(): Promise<LatestInvoice[]> {
  const supabase = createServerClient();
  // Requires FK: invoices.customer_id -> customers.id
  const { data, error } = await supabase
    .from('invoices')
    .select(
      `amount, id, date, customers:customers!inner(name, image_url, email)`
    )
    .order('date', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Supabase Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }

  const latest = (data ?? []).map((row: any) => ({
    amount: formatCurrency(row.amount),
    name: row.customers?.name,
    image_url: row.customers?.image_url,
    email: row.customers?.email,
    id: row.id,
  }));
  return latest as LatestInvoice[];
}

export async function fetchCardDataSupabase() {
  const supabase = createServerClient();

  const [invoiceCountRes, customerCountRes, totalsRes] = await Promise.all([
    supabase.from('invoices').select('*', { count: 'exact', head: true }),
    supabase.from('customers').select('*', { count: 'exact', head: true }),
    supabase
      .from('invoices')
      .select('amount, status')
  ]);

  if (invoiceCountRes.error || customerCountRes.error || totalsRes.error) {
    console.error('Supabase Error:', invoiceCountRes.error || customerCountRes.error || totalsRes.error);
    throw new Error('Failed to fetch card data.');
  }

  const numberOfInvoices = invoiceCountRes.count ?? 0;
  const numberOfCustomers = customerCountRes.count ?? 0;
  const sums = (totalsRes.data ?? []).reduce(
    (acc: { paid: number; pending: number }, row: any) => {
      if (row.status === 'paid') acc.paid += Number(row.amount) || 0;
      if (row.status === 'pending') acc.pending += Number(row.amount) || 0;
      return acc;
    },
    { paid: 0, pending: 0 }
  );

  return {
    numberOfInvoices,
    numberOfCustomers,
    totalPaidInvoices: formatCurrency(sums.paid),
    totalPendingInvoices: formatCurrency(sums.pending),
  };
}

const ITEMS_PER_PAGE = 6;

export async function fetchFilteredInvoicesSupabase(
  query: string,
  currentPage: number,
): Promise<InvoicesTable[]> {
  const supabase = createServerClient();
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // Join customers through FK; use text filters via ilike
  let req = supabase
    .from('invoices')
    .select(
      `id, amount, date, status, customers:customers!inner(name, email, image_url)`,
      { count: 'exact' }
    )
    .order('date', { ascending: false })
    .range(from, to);

  if (query) {
    req = req.or(
      `customers.name.ilike.%${query}%,customers.email.ilike.%${query}%,amount::text.ilike.%${query}%,date::text.ilike.%${query}%,status.ilike.%${query}%`
    );
  }

  const { data, error } = await req;
  if (error) {
    console.error('Supabase Error:', error);
    throw new Error('Failed to fetch invoices.');
  }

  // Map to expected shape
  const rows = (data ?? []).map((row: any) => ({
    id: row.id,
    amount: row.amount,
    date: row.date,
    status: row.status,
    name: row.customers?.name,
    email: row.customers?.email,
    image_url: row.customers?.image_url,
  }));
  return rows as InvoicesTable[];
}

export async function fetchInvoicesPagesSupabase(query: string) {
  const supabase = createServerClient();

  let req = supabase
    .from('invoices')
    .select('id, date, status, amount, customers:customers!inner(id)', { count: 'exact', head: true });

  if (query) {
    req = req.or(
      `customers.name.ilike.%${query}%,customers.email.ilike.%${query}%,amount::text.ilike.%${query}%,date::text.ilike.%${query}%,status.ilike.%${query}%`
    );
  }

  const { count, error } = await req;
  if (error) {
    console.error('Supabase Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
  return Math.ceil((count ?? 0) / ITEMS_PER_PAGE);
}

export async function fetchInvoiceByIdSupabase(id: string): Promise<InvoiceForm> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('invoices')
    .select('id, customer_id, amount, status')
    .eq('id', id)
    .limit(1)
    .single();

  if (error) {
    console.error('Supabase Error:', error);
    throw new Error('Failed to fetch invoice.');
  }

  return {
    id: data.id,
    customer_id: data.customer_id,
    amount: data.amount / 100, // cents -> dollars to match original behavior
    status: data.status,
  } as InvoiceForm;
}

export async function fetchCustomersSupabase(): Promise<CustomerField[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('customers')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) {
    console.error('Supabase Error:', error);
    throw new Error('Failed to fetch all customers.');
  }
  return (data as CustomerField[]) ?? [];
}

export async function fetchFilteredCustomersSupabase(query: string): Promise<FormattedCustomersTable[]> {
  const supabase = createServerClient();

  // Aggregate with two queries due to limited server-side computed aggregates across relations in PostgREST without RPC
  // 1) base customers filtered
  let baseReq = supabase
    .from('customers')
    .select('id, name, email, image_url');
  if (query) {
    baseReq = baseReq.or(`name.ilike.%${query}%,email.ilike.%${query}%`);
  }
  const { data: customers, error: customersError } = await baseReq;
  if (customersError) {
    console.error('Supabase Error:', customersError);
    throw new Error('Failed to fetch customer table.');
  }

  const ids = (customers ?? []).map((c: any) => c.id);
  if (ids.length === 0) return [];

  // 2) fetch invoice aggregates per customer
  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select('customer_id, amount, status')
    .in('customer_id', ids);

  if (invoicesError) {
    console.error('Supabase Error:', invoicesError);
    throw new Error('Failed to fetch customer table.');
  }

  const aggregates = new Map<string, { total_invoices: number; total_pending: number; total_paid: number }>();
  (invoices ?? []).forEach((row: any) => {
    const key = row.customer_id as string;
    const current = aggregates.get(key) ?? { total_invoices: 0, total_pending: 0, total_paid: 0 };
    current.total_invoices += 1;
    if (row.status === 'pending') current.total_pending += Number(row.amount) || 0;
    if (row.status === 'paid') current.total_paid += Number(row.amount) || 0;
    aggregates.set(key, current);
  });

  const result = (customers ?? []).map((c: any) => {
    const agg = aggregates.get(c.id) ?? { total_invoices: 0, total_pending: 0, total_paid: 0 };
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      image_url: c.image_url,
      total_invoices: agg.total_invoices,
      total_pending: formatCurrency(agg.total_pending),
      total_paid: formatCurrency(agg.total_paid),
    } as FormattedCustomersTable;
  });

  return result;
}


