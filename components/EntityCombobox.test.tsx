import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import { EntityCombobox, ComboItem } from './EntityCombobox';

afterEach(cleanup);

const items: ComboItem[] = [
  { id: 'a', name: 'Chocolate Cake' },
  { id: 'b', name: 'Carrot Cake' },
  { id: 'c', name: 'Sourdough' },
];

function renderCombobox(props: Partial<React.ComponentProps<typeof EntityCombobox>> = {}) {
  const onChange = vi.fn();
  const utils = render(
    <I18nProvider>
      <EntityCombobox items={items} value="" onChange={onChange} {...props} />
    </I18nProvider>
  );
  const input = screen.getByRole('textbox') as HTMLInputElement;
  return { onChange, input, ...utils };
}

describe('EntityCombobox', () => {
  it('fires onChange with the picked item id when an option is selected', () => {
    const { onChange, input } = renderCombobox();
    fireEvent.click(input); // open dropdown
    fireEvent.click(screen.getByText('Carrot Cake'));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('filters options by query across the name', () => {
    const { input } = renderCombobox();
    fireEvent.change(input, { target: { value: 'sour' } });
    expect(screen.getByText('Sourdough')).toBeInTheDocument();
    expect(screen.queryByText('Chocolate Cake')).not.toBeInTheDocument();
  });

  it('shows the empty label when nothing matches', () => {
    const { input } = renderCombobox({ emptyLabel: 'No recipes match' });
    fireEvent.change(input, { target: { value: 'zzz' } });
    expect(screen.getByText(/No recipes match/)).toBeInTheDocument();
  });

  it('clears the input when the parent resets value to empty (ready for next pick)', () => {
    const { input, rerender } = renderCombobox({ value: 'a' });
    // Type a query so the input holds text.
    fireEvent.change(input, { target: { value: 'choc' } });
    expect(input.value).toBe('choc');

    // Parent clears the selected value (e.g. after committing an add).
    rerender(
      <I18nProvider>
        <EntityCombobox items={items} value="" onChange={() => {}} />
      </I18nProvider>
    );
    expect(input.value).toBe('');
  });
});
