import styled from 'styled-components';

export const Row = styled.div`
  display: grid;
  gap: 12px;
  margin-bottom: 16px; /* 1. ADDED: consistent space below each row */

  &:last-child {
    margin-bottom: 0; /* 2. REMOVED: extra space after the last row in a group */
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(${(p) => p.cols || 2}, minmax(0, 1fr));
  }
`;

export const Label = styled.label`
  display: block;
  font-weight: 600;
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 6px;
`;

const formElementBase = `
  width: 100%; 
  border-radius: 12px; 
  border: 1px solid var(--border); 
  padding: 10px 12px; 
  outline: none;
  background: var(--card);
  color: var(--text);
  transition: border-color 0.2s, box-shadow 0.2s;

  &:focus { 
    border-color: var(--brand); 
    box-shadow: 0 0 0 2px #e0e7ff; 
  }
`;

export const Input = styled.input`
  ${formElementBase}
`;

export const Select = styled.select`
  ${formElementBase}
`;

export const Textarea = styled.textarea`
  ${formElementBase}
  min-height: 120px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  white-space: pre-wrap;
`;

export const ToggleWrap = styled.button`
  border: 1px solid ${p => (p.on ? "#c7d2fe" : "var(--border)")};
  background: ${p => (p.on ? "#eef2ff" : "var(--card)")};
  width: 48px; height: 28px; border-radius: 999px; position: relative; cursor: pointer;
  transition: background .15s ease, border-color .15s ease;
  &:after{
    content:""; position:absolute; top:3px; left:${p=>p.on?"24px":"3px"}; width:22px; height:22px; border-radius:50%;
    background: #fff; border:1px solid var(--border); box-shadow:0 1px 2px rgba(0,0,0,.06);
    transition:left .15s ease;
  }
`;