import styled from 'styled-components';
import backgroundImgLight from '../assets/background.jpg';
import backgroundImgDark from '../assets/background_dark.jpg'; // 1. Import the dark background

export const AppShell = styled.div`
  /* Light Mode (default) variables */
  --bg: #f8f9fa;
  --card: rgba(255, 255, 255, 0.9);
  --text: #212529;
  --muted: #6c757d;
  --border: #dee2e6;
  --brand: #4f46e5;
  --danger: #dc3545;
  
  min-height: 100vh;
  background-color: var(--bg);
  background-image: url(${backgroundImgLight}); // 2. Use light background by default
  background-size: cover;
  background-attachment: fixed; /* Keep background stationary */
  background-position: center;
  color: var(--text);
  font-family: 'Inter', ui-sans-serif, system-ui;
  transition: background-color 0.3s ease;

  body.dark & {
    --bg: #1a202c;
    --card: rgba(26, 32, 44, 0.85);
    --text: #e2e8f0;
    --muted: #a0aec0;
    --border: #4a5568;
    background-image: url(${backgroundImgDark}); // 3. Switch to dark background
  }
`;

export const Header = styled.header`
  position: sticky; top: 0; z-index: 10;
  background: var(--card); /* Use variable */
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
`;

export const HeaderInner = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  height: 64px;
`;

export const Container = styled.main`
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 24px 64px;
`;

export const H1 = styled.h1`
  margin: 0;
  font-weight: 700;
  font-size: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text);
`;

export const Small = styled.div`
  font-size: 12px;
  color: var(--muted);
`;

export const ControlsRow = styled.div`
  display: flex;
  gap: 8px;
  padding-top: 6px;
`;