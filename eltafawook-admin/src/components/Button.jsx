import styled, { css } from 'styled-components';

const Button = styled.button`
  border: none;
  border-radius: 12px;
  padding: 10px 14px;
  font-weight: 600;
  cursor: pointer;
  background: var(--brand);
  color: #fff;
  transition: all 0.15s ease-in-out;
  
  ${(p) =>
    p.$variant === "ghost" &&
    css`
      background: transparent;
      color: var(--brand);
      border: 1px solid #c7d2fe;
    `}
  ${(p) =>
    p.$variant === "danger" &&
    css`
      background: var(--danger);
    `}
  ${(p) =>
    p.$variant === "success" &&
    css`
      background: #059669;
      &:hover {
        background: #047857;
      }
    `}
  
  &:hover {
    filter: brightness(1.1);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }

  &:active {
      transform: translateY(-1px) scale(0.98);
      filter: brightness(1);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
    filter: none;
  }
`;

export default Button;