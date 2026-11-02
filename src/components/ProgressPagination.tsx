import { ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function ProgressPagination({ page, total, pageSize, onChange, label }: {
  page: number; total: number; pageSize: number; onChange: (page: number) => void; label: string;
}) {
  const last = Math.max(0, Math.ceil(total / pageSize) - 1);
  return <nav className="progress-pagination" aria-label={label}>
    <div><button aria-label="First page" disabled={page === 0} onClick={() => onChange(0)}><ChevronsLeft size={15}/></button><button disabled={page === 0} onClick={() => onChange(page - 1)}>Previous</button></div>
    <span>Page {page + 1} of {last + 1}</span>
    <div><button disabled={page === last} onClick={() => onChange(page + 1)}>Next</button><button aria-label="Last page" disabled={page === last} onClick={() => onChange(last)}><ChevronsRight size={15}/></button></div>
  </nav>;
}
