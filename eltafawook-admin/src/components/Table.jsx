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

export const InventoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 16px;
`;

export const InventoryItem = styled.div`
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  background: var(--bg);
`;

export const ItemName = styled.div`
  font-weight: 600;
  color: var(--text);
`;

export const StockCount = styled.div`
  font-size: 24px;
  font-weight: 800;
  color: var(--brand);
  margin: 4px 0;
`;

export const ItemMeta = styled.div`
  font-size: 12px;
  color: var(--muted);
  text-transform: uppercase;
`;