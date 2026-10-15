export const styles = {
  fieldItem: {
    padding: '1rem',
    border: '1px solid #e5e7eb',
    borderRadius: '0.375rem',
    background: '#f9fafb',
  },
  fieldHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  fieldTitle: {
    fontWeight: 600,
    color: '#111827',
  },
  deleteButton: {
    padding: '0.25rem 0.75rem',
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.75rem',
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#374151',
  },
  input: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
  },
  select: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
  },
  checkbox: {
    width: '1rem',
    height: '1rem',
  },
  helperText: {
    fontSize: '0.75rem',
    color: '#6b7280',
  },
  mappingCard: {
    border: '1px dashed #d1d5db',
    borderRadius: '0.375rem',
    padding: '0.75rem',
    background: 'white',
  },
  smallButton: {
    padding: '0.35rem 0.65rem',
    background: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.75rem',
    cursor: 'pointer',
  },
} as const;
