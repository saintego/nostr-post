import type { PostField } from '@nostr-post/core/types';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FieldEditor } from '../../components/FieldEditor';

describe('FieldEditor', () => {
  const mockField: PostField = {
    id: 'test-field',
    type: 'string',
    uiPlugin: 'text',
    mapTo: { kind: 1, target: 'content' },
    required: false,
    metadata: {
      label: 'Test Field',
      placeholder: 'Enter text...',
    },
  };

  const mockOnChange = vi.fn();
  const mockOnDelete = vi.fn();

  it('should render field editor with field data', () => {
    render(
      <FieldEditor field={mockField} kinds={[1]} onChange={mockOnChange} onDelete={mockOnDelete} />
    );

    expect(screen.getByDisplayValue('test-field')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Field')).toBeInTheDocument();
  });

  it('should call onChange when field id is updated', () => {
    render(
      <FieldEditor field={mockField} kinds={[1]} onChange={mockOnChange} onDelete={mockOnDelete} />
    );

    const idInput = screen.getByDisplayValue('test-field');
    fireEvent.change(idInput, { target: { value: 'new-field-id' } });

    expect(mockOnChange).toHaveBeenCalled();
  });

  it('should call onDelete when delete button is clicked', () => {
    render(
      <FieldEditor field={mockField} kinds={[1]} onChange={mockOnChange} onDelete={mockOnDelete} />
    );

    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalled();
  });

  it('should update metadata when label is changed', () => {
    render(
      <FieldEditor field={mockField} kinds={[1]} onChange={mockOnChange} onDelete={mockOnDelete} />
    );

    const labelInput = screen.getByDisplayValue('Test Field');
    fireEvent.change(labelInput, { target: { value: 'New Label' } });

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          label: 'New Label',
        }),
      })
    );
  });

  it('should handle required checkbox toggle', () => {
    render(
      <FieldEditor field={mockField} kinds={[1]} onChange={mockOnChange} onDelete={mockOnDelete} />
    );

    const requiredCheckbox = screen.getByLabelText('Required');
    fireEvent.click(requiredCheckbox);

    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({
        required: true,
      })
    );
  });

  it('should render available kinds in select', () => {
    render(
      <FieldEditor
        field={mockField}
        kinds={[1, 30023]}
        onChange={mockOnChange}
        onDelete={mockOnDelete}
      />
    );

    const kindSelect = screen.getByLabelText('Map To Kind:');
    expect(kindSelect).toBeInTheDocument();
  });
});
