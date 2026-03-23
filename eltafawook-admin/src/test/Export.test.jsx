/**
 * Tests for Export component.
 */
import './mocks';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Export from '../views/Export';

describe('Export', () => {
  beforeEach(() => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        blob: () => Promise.resolve(new Blob(['csv,data'], { type: 'text/csv' })),
        headers: new Headers({ 'content-type': 'text/csv' }),
      })
    );
    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:http://test/fake');
    global.URL.revokeObjectURL = vi.fn();
  });

  const props = {
    apiBase: 'http://localhost:8000/api/v1',
    authToken: 'test-token',
    toast: vi.fn(),
    branches: [{ id: '1', code: 'BAN', name: 'Banha' }],
  };

  it('renders without crashing', () => {
    render(<Export {...props} />);
  });

  it('renders export buttons', () => {
    const { container } = render(<Export {...props} />);
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
