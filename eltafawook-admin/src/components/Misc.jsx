import styled, { css } from "styled-components";

export const NavGrid = styled.div`
  display: grid; gap: 12px; margin-bottom: 16px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  @media (max-width: 1100px) { grid-template-columns: repeat(3, 1fr); }
  @media (max-width: 700px) { grid-template-columns: repeat(2, 1fr); }
`;

export const NavButton = styled.button`
  background: var(--card);
  color: var(--text);
  padding: 16px;
  border-radius: 16px;
  text-align: left;
  cursor: pointer;
  border: 1px solid var(--border);
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  transition: all .2s ease-out;
  
  display: flex;
  flex-direction: column;
  gap: 8px;
  
  ${(p) => p.$active && css`
    border-color: var(--brand);
    box-shadow: 0 0 0 3px #c7d2fe;
  `}

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  }

  .label { font-weight: 700; font-size: 16px; color: var(--text); }
  .kicker { display: none; }
`;

export const Helper = styled.p` margin: 6px 0 0; font-size: 12px; color: var(--muted); `;

export const Pill = styled.span`
  display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px;
  background: var(--bg);
  color: var(--muted);
  border: 1px solid var(--border);
`;

export const SubTabs = styled.div` display:flex; gap:8px; margin-bottom:12px; `;

export const SubTabButton = styled.button`
  border: 1px solid var(--border); 
  background: var(--card); 
  color: var(--text);
  border-radius: 10px; padding: 8px 12px; font-weight: 700; cursor: pointer;
  
  ${(p) => p.$active && css`
    border-color: var(--brand); 
    box-shadow: 0 0 0 2px #e0e7ff inset;
    background: var(--brand);
    color: #fff;
  `}
`;

export const MenuWrap = styled.div`position: relative;`;

export const Hamburger = styled.button`
  width: 36px; height: 32px; border: 1px solid var(--border);
  background: var(--card); 
  border-radius: 10px; cursor: pointer; display: grid; place-items: center;
  &:hover { background: var(--bg); }
  & > span { display:block; width:18px; height:2px; background: var(--text); margin:2px 0; border-radius: 1px; }
`;

export const Dropdown = styled.div`
  position: absolute; right: 0; top: 40px; 
  background: var(--card); 
  border: 1px solid var(--border);
  border-radius: 12px; box-shadow: 0 6px 22px rgba(0,0,0,.08); min-width: 200px; overflow: hidden; z-index: 20;
`;

export const DropItem = styled.button`
  width: 100%; text-align: left; padding: 10px 12px; 
  background: transparent; 
  color: var(--text);
  border: none; cursor: pointer; font-weight:600;
  &:hover { background: var(--bg); }
`;

export const ToastStack = styled.div`
  position: fixed; right: 16px; bottom: 16px; z-index: 50; display: flex; flex-direction: column; gap: 10px; width: 360px; pointer-events: none;
`;

export const Toast = styled.div`
  pointer-events: auto; 
  border: 1px solid var(--border); 
  border-radius: 14px; 
  background: var(--card);
  color: var(--text);
  box-shadow: 0 2px 10px rgba(0,0,0,.05);
  ${(p) => p.$tone === "error" && css`border-color: #fecaca; background: #fff1f2; color: #991b1b;`}
  padding: 10px 12px; display: flex; justify-content: space-between; gap: 10px;
`;