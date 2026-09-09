'use client';

import { FormEvent, useEffect, useState } from 'react';
import { adminRepository } from '../../../lib/data/admin-repository';
import type { AdminSection, OrderStatus } from '../../../lib/domain/types';

const sections = new Set<AdminSection>([
  'products',
  'categories',
  'inventory',
  'orders',
  'customers',
  'banners',
  'featured',
  'settings',
]);

const statuses: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
];

type Row = Record<string, unknown> & { id?: string };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export default function Section({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const [section, setSection] = useState<AdminSection | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Row | null>(null);

  useEffect(() => {
    params.then(({ section: value }) => setSection(value as AdminSection));
  }, [params]);

  useEffect(() => {
    if (section && sections.has(section)) void load(section);
  }, [section]);

  async function load(currentSection: AdminSection) {
    setLoading(true);
    setError('');
    try {
      setRows((await adminRepository.list(currentSection)) as Row[]);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!section || !confirm('Delete this record permanently?')) return;
    try {
      await adminRepository.remove(section, id);
      await load(section);
    } catch (removeError) {
      setError(errorMessage(removeError));
    }
  }

  async function updateStatus(id: string, status: OrderStatus) {
    if (!section) return;
    try {
      await adminRepository.setOrderStatus(id, status);
      await load(section);
    } catch (statusError) {
      setError(errorMessage(statusError));
    }
  }

  async function updateStock(id: string, current: unknown) {
    if (!section) return;
    const value = prompt('New stock quantity', String(current ?? 0));
    if (value === null) return;
    const stock = Number(value);
    if (!Number.isInteger(stock) || stock < 0) {
      setError('Stock must be a non-negative whole number.');
      return;
    }
    try {
      await adminRepository.setProductStock(id, stock);
      await load(section);
    } catch (stockError) {
      setError(errorMessage(stockError));
    }
  }

  async function removeFeatured(id: string) {
    if (!section) return;
    try {
      await adminRepository.setProductFeatured(id, false);
      await load(section);
    } catch (featuredError) {
      setError(errorMessage(featuredError));
    }
  }

  if (!section) return <main className="p-10">Loading…</main>;
  if (!sections.has(section)) return <main className="p-10">Unknown section</main>;

  const editable = ['products', 'categories', 'banners'].includes(section);

  return (
    <main className="min-h-screen p-5 md:p-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <a href="/dashboard" className="text-sm text-leaf-700">
            ← Dashboard
          </a>
          <h1 className="mt-2 text-3xl font-black capitalize">{section}</h1>
        </div>
        {editable && (
          <button
            onClick={() => setEditing({})}
            className="rounded-xl bg-leaf-700 px-4 py-3 font-bold text-white"
          >
            Add new
          </button>
        )}
      </div>

      {section === 'settings' && (
        <div className="glass rounded-3xl p-6 text-slate-600">
          Environment, authentication and deployment settings are managed securely
          through Supabase and Vercel rather than stored in a public database table.
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</div>
      )}

      {section !== 'settings' && (
        <div className="glass overflow-x-auto rounded-3xl p-5">
          {loading ? (
            <p className="animate-pulse text-slate-500">Loading records…</p>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-slate-500">No records found yet.</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-leaf-50 text-sm text-slate-500">
                  <th className="p-3">Name</th>
                  <th className="p-3">Status / value</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const id = typeof row.id === 'string' ? row.id : '';
                  const name =
                    row.name_en ?? row.title_en ?? row.full_name ?? row.email ?? id;

                  return (
                    <tr key={id || index} className="border-b border-leaf-50">
                      <td className="p-3 font-semibold">{String(name || '—')}</td>
                      <td className="p-3">
                        {section === 'orders' && id ? (
                          <select
                            value={String(row.status ?? 'pending')}
                            onChange={(event) =>
                              void updateStatus(id, event.target.value as OrderStatus)
                            }
                            className="rounded-lg border p-2"
                          >
                            {statuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        ) : section === 'inventory' ? (
                          String(row.stock ?? 0)
                        ) : section === 'banners' ? (
                          String(row.active ?? false)
                        ) : section === 'featured' ? (
                          'Featured'
                        ) : (
                          String(row.price_iqd ?? row.stock ?? row.is_active ?? '—')
                        )}
                      </td>
                      <td className="p-3">
                        {editable && id && (
                          <>
                            <button
                              onClick={() => setEditing(row)}
                              className="mr-2 rounded-lg bg-leaf-50 px-3 py-2 text-leaf-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => void remove(id)}
                              className="rounded-lg bg-red-50 px-3 py-2 text-red-600"
                            >
                              Delete
                            </button>
                          </>
                        )}
                        {section === 'inventory' && id && (
                          <button
                            onClick={() => void updateStock(id, row.stock)}
                            className="rounded-lg bg-leaf-50 px-3 py-2 text-leaf-700"
                          >
                            Update stock
                          </button>
                        )}
                        {section === 'featured' && id && (
                          <button
                            onClick={() => void removeFeatured(id)}
                            className="rounded-lg bg-red-50 px-3 py-2 text-red-600"
                          >
                            Remove featured
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {editing && editable && (
        <Editor
          section={section}
          row={editing}
          close={() => setEditing(null)}
          saved={() => {
            setEditing(null);
            void load(section);
          }}
        />
      )}
    </main>
  );
}

function Editor({
  section,
  row,
  close,
  saved,
}: {
  section: AdminSection;
  row: Row;
  close: () => void;
  saved: () => void;
}) {
  const [form, setForm] = useState<Row>({ ...row });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const set = (key: string, value: unknown) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      let image = String(
        section === 'categories' ? form.image ?? '' : form.image_url ?? '',
      );
      if (file) image = await adminRepository.upload(file);

      let values: Record<string, unknown>;
      if (section === 'products') {
        values = {
          name_ku: String(form.name_ku ?? '').trim(),
          name_ar: String(form.name_ar ?? '').trim(),
          name_en: String(form.name_en ?? '').trim(),
          description: String(form.description ?? '').trim(),
          price_iqd: Number(form.price_iqd ?? 0),
          stock: Number(form.stock ?? 0),
          unit: String(form.unit ?? 'kg'),
          is_active: form.is_active !== false,
          featured: form.featured === true,
          best_seller: form.best_seller === true,
          image_url: image || null,
        };
      } else if (section === 'categories') {
        values = {
          name_ku: String(form.name_ku ?? '').trim(),
          name_ar: String(form.name_ar ?? '').trim(),
          name_en: String(form.name_en ?? '').trim(),
          image: image || null,
        };
      } else if (section === 'banners') {
        values = {
          title_ku: String(form.title_ku ?? '').trim(),
          title_ar: String(form.title_ar ?? '').trim(),
          title_en: String(form.title_en ?? '').trim(),
          image_url: image,
          active: form.active !== false,
        };
      } else {
        throw new Error('This section is not editable.');
      }

      const id = typeof form.id === 'string' ? form.id : undefined;
      await adminRepository.save(section, values, id);
      saved();
    } catch (submitError) {
      setError(errorMessage(submitError));
    } finally {
      setBusy(false);
    }
  }

  const nameKeys = section === 'banners'
    ? ['title_ku', 'title_ar', 'title_en']
    : ['name_ku', 'name_ar', 'name_en'];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-5">
      <form
        onSubmit={submit}
        className="glass max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl p-7"
      >
        <h2 className="text-2xl font-black">
          {form.id ? 'Edit' : 'Add'} {section}
        </h2>

        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {nameKeys.map((key) => (
            <input
              required
              key={key}
              placeholder={key}
              value={String(form[key] ?? '')}
              onChange={(event) => set(key, event.target.value)}
              className="rounded-xl border p-3"
            />
          ))}

          {section === 'products' && (
            <>
              <input
                type="number"
                min="0"
                step="1"
                required
                placeholder="Price IQD"
                value={String(form.price_iqd ?? '')}
                onChange={(event) => set('price_iqd', event.target.value)}
                className="rounded-xl border p-3"
              />
              <input
                type="number"
                min="0"
                step="1"
                required
                placeholder="Stock"
                value={String(form.stock ?? '')}
                onChange={(event) => set('stock', event.target.value)}
                className="rounded-xl border p-3"
              />
              <select
                value={String(form.unit ?? 'kg')}
                onChange={(event) => set('unit', event.target.value)}
                className="rounded-xl border p-3"
              >
                <option value="kg">Kg</option>
                <option value="g">Gram</option>
                <option value="pack">Pack</option>
                <option value="bag">Bag</option>
              </select>
              <label className="flex items-center gap-2 rounded-xl border p-3">
                <input
                  type="checkbox"
                  checked={form.is_active !== false}
                  onChange={(event) => set('is_active', event.target.checked)}
                />
                Active
              </label>
              <label className="flex items-center gap-2 rounded-xl border p-3">
                <input
                  type="checkbox"
                  checked={form.featured === true}
                  onChange={(event) => set('featured', event.target.checked)}
                />
                Featured
              </label>
              <label className="flex items-center gap-2 rounded-xl border p-3">
                <input
                  type="checkbox"
                  checked={form.best_seller === true}
                  onChange={(event) => set('best_seller', event.target.checked)}
                />
                Best seller
              </label>
              <textarea
                placeholder="Description"
                value={String(form.description ?? '')}
                onChange={(event) => set('description', event.target.value)}
                className="rounded-xl border p-3 sm:col-span-2"
              />
            </>
          )}

          {section === 'banners' && (
            <label className="flex items-center gap-2 rounded-xl border p-3">
              <input
                type="checkbox"
                checked={form.active !== false}
                onChange={(event) => set('active', event.target.checked)}
              />
              Active
            </label>
          )}
        </div>

        <input
          className="mt-4"
          type="file"
          accept="image/*"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={close} className="rounded-xl border px-4 py-3">
            Cancel
          </button>
          <button
            disabled={busy}
            className="rounded-xl bg-leaf-700 px-5 py-3 font-bold text-white disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
