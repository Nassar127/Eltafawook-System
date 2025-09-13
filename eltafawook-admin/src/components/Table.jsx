import styled from 'styled-components';

export const TableWrap = styled.div` 
  border: 1px solid var(--border); 
  border-radius: 12px; 
  overflow: auto; 
  max-height: 360px; 
  background-color: var(--card);
`;

export const Table = styled.table`
  width: 100%; 
  border-collapse: collapse; 
  font-size: 13px;
  
  th, td { 
    padding: 10px 12px; 
    border-top: 1px solid var(--border); 
    text-align: left;
  }

  thead th { 
    position: sticky; 
    top: 0; 
    background: var(--bg); 
    color: var(--text);
    z-index: 1; 
  }

  tbody tr {
      background-color: transparent; /* Let wrapper handle color */
  }

  tbody tr:nth-child(even) {
      background-color: rgba(0,0,0,0.02);
      body.dark & {
        background-color: rgba(255,255,255,0.02);
      }
  }

  tbody tr:hover {
      background-color: var(--border);
  }
`;