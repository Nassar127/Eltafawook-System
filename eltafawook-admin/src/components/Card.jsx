import styled, { keyframes } from 'styled-components';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const Card = styled.section`
  background: var(--card);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0,0,0,.08);
  overflow: hidden;
  margin-bottom: 16px;
  animation: ${fadeIn} 0.4s ease-out;
`;

export const CardHead = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; 
  border-bottom: 1px solid var(--border);
`;

export const CardTitle = styled.h3`
  margin: 0; 
  font-size: 15px; 
  font-weight: 700;
  color: var(--text);
`;

export const CardBody  = styled.div` padding: 16px; `;