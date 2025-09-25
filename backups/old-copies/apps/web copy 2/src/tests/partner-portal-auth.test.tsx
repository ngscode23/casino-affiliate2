import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '@ui/components/auth/ProtectedRoute';
import { render, screen } from '@testing-library/react';

function Dummy() { return <div>OK</div>; }
function Login() { return <div>LOGIN</div>; }

// Mock getUser to simulate auth states
vi.mock('@shared/lib/auth', () => ({
  getUser: vi.fn(async () => null)
}));

describe('Partner Portal auth', () => {
  it('redirects unauthenticated users to login', async () => {
    render(
      <MemoryRouter initialEntries={["/partner"]}>
        <Routes>
          <Route path="/partner" element={<ProtectedRoute><Dummy/></ProtectedRoute>} />
          <Route path="/auth/login" element={<Login/>} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByText('LOGIN');
    expect(screen.queryByText('OK')).toBeNull();
  });
});

