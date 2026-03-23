/**
 * Tests for Dashboard component.
 */
import './mocks';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const mockSummary = {
  total_students: 150,
  total_kg_students: 20,
  sales_today: { count: 5, revenue_cents: 50000 },
  sales_month: { count: 40, revenue_cents: 500000 },
  low_stock_items: [{ item_name: 'Notebook', branch_code: 'BAN', on_hand: 2 }],
  reservations_by_status: { hold: 10, active: 5 },
  branches_today: [],
};

// Mock apiFetch before importing Dashboard
vi.mock('../api', () => ({
  apiFetch: vi.fn(() => Promise.resolve(mockSummary)),
}));

import Dashboard from '../views/Dashboard';

const makeToast = () => ({ push: vi.fn() });

describe('Dashboard', () => {
  const props = {
    apiBase: 'http://localhost:8000/api/v1',
    authToken: 'test-token',
    toast: makeToast(),
    branches: [{ id: '1', code: 'BAN', name: 'Banha' }],
  };

  it('renders without crashing', () => {
    render(<Dashboard {...props} />);
  });

  it('calls apiFetch on mount', async () => {
    const { apiFetch } = await import('../api');
    render(<Dashboard {...props} />);
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalled();
    });
  });

  it('displays KPI data after fetch', async () => {
    const { container } = render(<Dashboard {...props} />);
    await waitFor(() => {
      // After data loads, should show student count
      expect(screen.getByText('150')).toBeInTheDocument();
    });
  });
});
