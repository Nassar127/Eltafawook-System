import React, { useEffect, useState, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { jwtDecode } from 'jwt-decode';
import { apiFetch } from './api';
import { useToast } from './hooks/useToast';
import { loadSettings, saveSettings } from './utils/settings';
import Students from './views/Students';
import Items from './views/Items';
import Orders from './views/Orders';
import Reports from './views/Reports';
import Settings from './views/Settings';
import Teachers from './views/Teachers';
import Login from './views/Login';
import Transfers from './views/Transfers';
import KgStudents from './views/KgStudents';
import KgItems from './views/KgItems';
import KgOrders from './views/KgOrders';
import KgReports from './views/KgReports';
import { AppShell, Header, HeaderInner, Container, H1 } from './components/Layout';
import { NavGrid, NavButton, Pill, MenuWrap, Hamburger, Dropdown, DropItem, ToastStack, Toast, SubTabs, SubTabButton } from './components/Misc';
import { StudentIcon, OrdersIcon, ItemsIcon, TransferIcon, ReportsIcon, KgIcon } from "./components/Icons";
import logo from './assets/logo.png';

export default function App() {
  const [apiBase, setApiBase] = useState(() => localStorage.getItem("apiBase") || "https://gmbh-robinson-baltimore-hidden.trycloudflare.com/api/v1");
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("authToken") || sessionStorage.getItem("authToken"));
  const [currentUser, setCurrentUser] = useState(null);
  const [settings, setSettings] = useState(loadSettings());
  const [menuOpen, setMenuOpen] = useState(false);
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [schools, setSchools] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [items, setItems] = useState([]);
  const [kgItems, setKgItems] = useState([]);
  
  const toast = useToast();
  const [mainView, setMainView] = useState("bookshop");
  const [view, setView] = useState("students");
  const { t, i18n } = useTranslation();
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (authToken) {
      const decodedToken = jwtDecode(authToken);
      setCurrentUser(decodedToken);

      (async () => {
        try {
          const bs = await apiFetch(apiBase, "/branches", { authToken });
          setBranches(bs);
          if (decodedToken.role === 'admin') {
            const savedBranchId = localStorage.getItem("adminBranchId");
            const targetBranch = bs.find(b => b.id === savedBranchId) || bs.find(b => b.code === 'BAN') || bs[0];
            if (targetBranch) {
              setBranchId(targetBranch.id);
              setBranchCode(targetBranch.code);
            }
          } else {
            const userBranch = bs.find(b => b.id === decodedToken.branch_id);
            if (userBranch) {
              setBranchId(userBranch.id);
              setBranchCode(userBranch.code);
            }
          }
        } catch (e) { toast.push({ title: "Failed to load branches", description: String(e.message), tone: "error" }); }
        
        try {
          const ss = await apiFetch(apiBase, "/schools", { authToken });
          setSchools(ss || []);
        } catch (e) { toast.push({ title: "Failed to load schools", description: String(e.message), tone: "error" }); }

        try {
          const its = await apiFetch(apiBase, "/items", { authToken });
          setItems(Array.isArray(its) ? its : []);
        } catch (e) { toast.push({ title: "Failed to load items", description: String(e.message), tone: "error" }); }

        try {
          const ts = await apiFetch(apiBase, "/teachers", { authToken });
          setTeachers(Array.isArray(ts) ? ts : []);
        } catch (e) { toast.push({ title: "Failed to load teachers", description: String(e.message), tone: "error" }); }

      })();
    }
  }, [apiBase, authToken]);

  useEffect(() => {
    const fetchKgData = async () => {
        if (branchCode === 'QAL') {
            try {
                const kIts = await apiFetch(apiBase, `/kg-items?branch_id=${branchId}`, { authToken });
                setKgItems(Array.isArray(kIts) ? kIts : []);
            } catch (e) {
                toast.push({ title: "Failed to load KG items", description: String(e.message), tone: "error" });
            }
        } else {
            setKgItems([]);
        }
    };

    if (branchId && branchCode) {
        fetchKgData();
    }
  }, [branchId, branchCode, apiBase, authToken]);

 
  function handleLoginSuccess(token, rememberMe) {
    if (rememberMe) {
      localStorage.setItem("authToken", token);
    } else {
      sessionStorage.setItem("authToken", token);
    }
    setAuthToken(token);
    toast.push({ title: "Login successful!" });
  }
 
  function handleLogout() {
    localStorage.removeItem("authToken");
    sessionStorage.removeItem("authToken");
    setAuthToken(null);
    setCurrentUser(null);
    setMenuOpen(false);
    toast.push({ title: "You have been logged out." });
  }
 
  const handleBranchChange = (newBranchId) => {
      const newBranch = branches.find(b => b.id === newBranchId);
      if (newBranch) {
          setBranchId(newBranch.id);
          setBranchCode(newBranch.code);
          localStorage.setItem("adminBranchId", newBranch.id);
          toast.push({ title: `Switched to ${newBranch.name} branch`});
          setMenuOpen(false);
          if (newBranch.code !== 'QAL') {
              setMainView('bookshop');
              setView('students');
          }
      }
  };

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
    setMenuOpen(false);
  };

  const handleLanguageChange = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    setMenuOpen(false);
  };

  const itemById = useMemo(() => Object.fromEntries((items || []).map(i => [i.id, i])), [items]);
  const teacherById = useMemo(() => Object.fromEntries((teachers || []).map(t => [t.id, t])), [teachers]);
  
  if (!authToken) {
    return <Login apiBase={apiBase} onLoginSuccess={handleLoginSuccess} />;
  }
  
   return (
    <AppShell>
      <Header>
        <HeaderInner>
            <H1>
                <img src={logo} alt="Eltafawook Academy Logo" style={{ height: '40px' }} />
                {t('appName')}
            </H1>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Pill>{branchCode || '...'}</Pill>
            {currentUser?.role === 'admin' && <Pill style={{ background: "#eef2ff", borderColor: "#c7d2fe" }}>Admin</Pill>}
            <MenuWrap>
              <Hamburger onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
                <span></span><span></span><span></span>
              </Hamburger>
              {menuOpen && (
                <Dropdown>
                  <DropItem onClick={handleLanguageChange}> {i18n.language === 'en' ? 'العربية' : 'English'} </DropItem>
                  <DropItem onClick={toggleTheme}> Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode </DropItem>

                  {currentUser?.role === 'admin' && (<> <DropItem onClick={() => { setView("teachers"); setMenuOpen(false); }}>{t('menuAddTeacher')}</DropItem> <DropItem onClick={() => { setView("settings"); setMenuOpen(false); }}>{t('menuSettings')}</DropItem></>)}
                  <DropItem onClick={handleLogout}>{t('menuLogout')}</DropItem>
                </Dropdown>
              )}
            </MenuWrap>
          </div>
        </HeaderInner>
      </Header>

      <Container>
        <SubTabs style={{ marginBottom: '24px' }}>
            <SubTabButton $active={mainView === 'bookshop'} onClick={() => { setMainView('bookshop'); setView('students'); }}>
                {t('pageBookshop')}
            </SubTabButton>
            {branchCode === 'QAL' && (
                <SubTabButton $active={mainView === 'kindergarten'} onClick={() => { setMainView('kindergarten'); setView('kg_students'); }}>
                    {t('pageKindergarten')}
                </SubTabButton>
            )}
        </SubTabs>

        {mainView === 'bookshop' && (
            <>
                <NavGrid>
                    <NavButton $active={view==="students"} onClick={() => setView("students")}>
                        <StudentIcon /><span className="label">{t('navStudentReg')}</span>
                    </NavButton>
                    <NavButton $active={view==="reservations"} onClick={() => setView("reservations")}>
                        <OrdersIcon /><span className="label">{t('navOrders')}</span>
                    </NavButton>
                    <NavButton $active={view==="items"} onClick={() => setView("items")}>
                        <ItemsIcon /><span className="label">{t('navItems')}</span>
                    </NavButton>
                    {currentUser?.role === 'admin' && (
                        <NavButton $active={view === "transfers"} onClick={() => setView("transfers")}>
                            <TransferIcon /><span className="label">{t('navTransfer')}</span>
                        </NavButton>
                    )}
                    <NavButton $active={view==="reports"} onClick={() => setView("reports")}>
                        <ReportsIcon /><span className="label">{t('navReports')}</span>
                    </NavButton>
                </NavGrid>

                {view === "students" && <Students apiBase={apiBase} authToken={authToken} toast={toast} schools={schools} branchId={branchId} settings={settings} />}
                {view === "items" && <Items apiBase={apiBase} authToken={authToken} toast={toast} branchId={branchId} branchCode={branchCode} teachers={teachers} setTeachers={setTeachers} items={items} setItems={setItems} itemById={itemById} teacherById={teacherById} currentUser={currentUser} />}
                {view === "reservations" && (<Orders apiBase={apiBase} authToken={authToken} toast={toast} branchId={branchId} branchCode={branchCode} teachers={teachers} setTeachers={setTeachers} items={items} setItems={setItems} itemById={itemById} teacherById={teacherById} currentUser={currentUser}/>)}
                {view === "reports" && <Reports apiBase={apiBase} authToken={authToken} toast={toast} branchId={branchId} branchCode={branchCode} currentUser={currentUser} />}
                {currentUser?.role === 'admin' && view === "transfers" && ( <Transfers apiBase={apiBase} authToken={authToken} toast={toast} branches={branches} teachers={teachers} /> )}
            </>
        )}

        {mainView === 'kindergarten' && branchCode === 'QAL' && (
            <>
                <NavGrid>
                    <NavButton $active={view==="kg_students"} onClick={() => setView("kg_students")}>
                        <KgIcon /><span className="label">{t('navKgReg')}</span>
                    </NavButton>
                    <NavButton $active={view==="kg_orders"} onClick={() => setView("kg_orders")}>
                        <OrdersIcon /><span className="label">{t('navKgOrders')}</span>
                    </NavButton>
                    <NavButton $active={view==="kg_items"} onClick={() => setView("kg_items")}>
                        <ItemsIcon /><span className="label">{t('navKgItems')}</span>
                    </NavButton>
                    <NavButton $active={view==="kg_reports"} onClick={() => setView("kg_reports")}>
                        <ReportsIcon /><span className="label">{t('navKgReports')}</span>
                    </NavButton>
                </NavGrid>

                {view === "kg_students" && <KgStudents apiBase={apiBase} authToken={authToken} toast={toast} branchId={branchId} />}
                {view === "kg_items" && <KgItems apiBase={apiBase} authToken={authToken} toast={toast} branchId={branchId} kgItems={kgItems} setKgItems={setKgItems} currentUser={currentUser}/>}      
                {view === "kg_orders" && <KgOrders apiBase={apiBase} authToken={authToken} toast={toast} branchId={branchId} kgItems={kgItems} />}
                {view === "kg_reports" && <KgReports apiBase={apiBase} authToken={authToken} toast={toast} branchId={branchId} currentUser={currentUser} />}
            </>
        )}
        
        {currentUser?.role === 'admin' && view === "teachers" && <Teachers apiBase={apiBase} authToken={authToken} toast={toast} teachers={teachers} setTeachers={setTeachers} />}
        {currentUser?.role === 'admin' && view === "settings" && 
            <Settings 
                settings={settings} 
                setSettings={setSettings} 
                toast={toast} 
                currentUser={currentUser} 
                branches={branches} 
                activeBranchId={branchId} 
                onBranchChange={handleBranchChange}
        />}

      </Container>     
      <ToastStack>
        {toast.toasts.map((t) => (
          <Toast key={t.id} $tone={t.tone}>
            <div>
              <div style={{fontWeight:700}}>{t.title}</div>
              {t.description && <div style={{fontSize:12, color:"#475569", marginTop:4}}>{t.description}</div>}
            </div>
            <button onClick={() => toast.remove(t.id)} style={{border:"none", background:"transparent", cursor:"pointer", color:"#94a3b8"}}>✕</button>
          </Toast>
        ))}
      </ToastStack>
    </AppShell>
  );
}
