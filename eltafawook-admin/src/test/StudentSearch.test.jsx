/**
 * Tests for StudentSearch component.
 */
import './mocks';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StudentSearch from '../views/orders/StudentSearch';

const defaultProps = {
  searchTerm: '',
  setSearchTerm: vi.fn(),
  searching: false,
  onSearch: vi.fn(),
  rows: [],
  onSelect: vi.fn(),
};

describe('StudentSearch', () => {
  it('renders search input and button', () => {
    render(<StudentSearch {...defaultProps} />);
    expect(screen.getByPlaceholderText('placeholders.search_student')).toBeInTheDocument();
    expect(screen.getByText('buttons_orders.search')).toBeInTheDocument();
  });

  it('shows "searching" text when searching is true', () => {
    render(<StudentSearch {...defaultProps} searching={true} />);
    expect(screen.getByText('buttons_orders.searching')).toBeInTheDocument();
  });

  it('disables button when searching', () => {
    render(<StudentSearch {...defaultProps} searching={true} />);
    const btn = screen.getByText('buttons_orders.searching');
    expect(btn).toBeDisabled();
  });

  it('calls setSearchTerm on input change', () => {
    const setSearchTerm = vi.fn();
    render(<StudentSearch {...defaultProps} setSearchTerm={setSearchTerm} />);
    fireEvent.change(screen.getByPlaceholderText('placeholders.search_student'), { target: { value: 'Ahmed' } });
    expect(setSearchTerm).toHaveBeenCalled();
  });

  it('calls onSearch on Enter key', () => {
    const onSearch = vi.fn();
    render(<StudentSearch {...defaultProps} onSearch={onSearch} />);
    fireEvent.keyDown(screen.getByPlaceholderText('placeholders.search_student'), { key: 'Enter' });
    expect(onSearch).toHaveBeenCalled();
  });

  it('calls onSearch on button click', () => {
    const onSearch = vi.fn();
    render(<StudentSearch {...defaultProps} onSearch={onSearch} />);
    fireEvent.click(screen.getByText('buttons_orders.search'));
    expect(onSearch).toHaveBeenCalled();
  });

  it('renders result rows when provided', () => {
    const rows = [
      { id: '1', public_id: 'STU-001', full_name: 'Ahmed Ali', phone: '01234', parent_phone: '05678' },
      { id: '2', public_id: 'STU-002', full_name: 'Sara Mohamed', phone: '09876', parent_phone: '04321' },
    ];
    render(<StudentSearch {...defaultProps} rows={rows} />);
    expect(screen.getByText('Ahmed Ali')).toBeInTheDocument();
    expect(screen.getByText('Sara Mohamed')).toBeInTheDocument();
    expect(screen.getByText('STU-001')).toBeInTheDocument();
    expect(screen.getByText('STU-002')).toBeInTheDocument();
  });

  it('calls onSelect when select button is clicked', () => {
    const onSelect = vi.fn();
    const rows = [{ id: '1', public_id: 'STU-001', full_name: 'Ahmed Ali', phone: '01234', parent_phone: '05678' }];
    render(<StudentSearch {...defaultProps} rows={rows} onSelect={onSelect} />);
    const selectBtns = screen.getAllByText('buttons_orders.select');
    fireEvent.click(selectBtns[0]);
    expect(onSelect).toHaveBeenCalledWith(rows[0]);
  });

  it('does not render table when rows is empty', () => {
    render(<StudentSearch {...defaultProps} rows={[]} />);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
