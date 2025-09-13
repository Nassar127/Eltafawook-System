import React, { useState } from 'react';
import styled from 'styled-components';
import { apiFetch } from '../api';
import Button from '../components/Button';
import { Card, CardHead, CardTitle, CardBody } from '../components/Card';
import { Label, Input } from '../components/Form';
import loginBg from '../assets/login_back.jpg';
import { useTranslation } from "react-i18next";

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '1.2em', height: '1.2em', color: '#a0aec0' }}>
    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.438-.695Z" clipRule="evenodd" />
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '1.2em', height: '1.2em', color: '#a0aec0' }}>
    <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
  </svg>
);

const BACKGROUND_IMAGE_URL = loginBg;

const LoginWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-image: url(${BACKGROUND_IMAGE_URL});
  background-size: cover;
  background-position: center;
`;

const FormContainer = styled.div`
  width: 100%;
  max-width: 450px;
  padding: 1rem;
`;

const LoginCard = styled(Card)`
  background-color: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.75rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px);
  overflow: hidden;
`;

const CardHeadStyled = styled(CardHead)`
  background: transparent;
  border-bottom: 1px solid #e2e8f0;
  padding: 1.5rem 2rem;
`;

const CardBodyStyled = styled(CardBody)`
  padding: 2rem;
`;

const CardTitleStyled = styled(CardTitle)`
  color: #1a202c;
  width: 100%;
  text-align: center;
  font-size: 1.5rem;
  font-weight: 700;
`;

const FormGroup = styled.div`
  margin-bottom: 1.25rem;
  position: relative;
`;

const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #f8fafc;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  &:focus-within {
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
  }

  svg {
    flex-shrink: 0;
    margin-right: 0.75rem;
    color: #a0aec0;
  }
`;

const StyledInput = styled(Input)`
  flex-grow: 1;
  border: none;
  background-color: transparent;
  padding: 0;
  font-size: 1rem;
  color: #1a202c;
  &:focus {
    outline: none;
    box-shadow: none;
  }
  &::placeholder {
    color: #a0aec0;
  }
`;

const CheckboxWrapper = styled.div`
  display: flex;
  align-items: center;
  margin-top: 1rem;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: #4a5568;
`;

const StyledCheckbox = styled.input`
  width: 1.1em;
  height: 1.1em;
  border-radius: 0.25em;
  accent-color: #3b82f6;
  cursor: pointer;
`;

const LoginButton = styled(Button)`
  width: 100%;
  padding: 0.75rem 1rem;
  font-size: 1rem;
  color: white;
  border-radius: 0.5rem;
  margin-top: 1.5rem;
  background-color: #3b82f6;
  border: none;
  transition: background-color 0.2s ease, transform 0.1s ease;
  &:hover {
    background-color: #2563eb;
    transform: translateY(-2px);
    filter: brightness(1.1);
  }
`;

const ErrorMessage = styled.p`
  color: var(--danger);
  font-size: 0.875rem;
  margin-top: 1rem;
  text-align: center;
`;

const ShowPasswordButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  margin-left: 0.5rem;
  display: flex;
  align-items: center;
  color: #a0aec0;

  &:hover {
    color: #2d3748;
  }
`;


export default function Login({ apiBase, onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { t, i18n } = useTranslation("login");

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      const data = await apiFetch(apiBase, '/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });
      if (data.access_token) {
        onLoginSuccess(data.access_token, rememberMe);
      }
    } catch (err) {
      setError(t("errors.incorrect_credentials"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoginWrapper dir={i18n.dir()} lang={i18n.language}>
      <FormContainer>
        <form onSubmit={handleLogin}>
          <LoginCard>
            <CardHeadStyled>
              <CardTitleStyled>{t("title_login", { brand: t("brand"), signIn: t("sign_in") })}</CardTitleStyled>
            </CardHeadStyled>
            <CardBodyStyled>
              <FormGroup>
                <Label htmlFor="username" style={{ color: '#4a5568', marginBottom: '0.5rem', display: 'block' }}> {t("fields_login.username")}</Label>
                <InputWrapper>
                  <UserIcon />
                  <StyledInput id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder={t("fields_login.username_ph")} autoComplete="username"/>
                </InputWrapper>
              </FormGroup>
              <FormGroup>
              <Label htmlFor="password" style={{ color: '#4a5568', marginBottom: '0.5rem', display: 'block' }}>{t("fields_login.password")}</Label>
              <InputWrapper>
                <LockIcon />
                <StyledInput
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder={t("fields_login.password_ph")}
                  autoComplete="current-password"
                />
                  <ShowPasswordButton
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    aria-label={t("aria.toggle_password")}
                    title={t("aria.toggle_password")}
                  >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style={{ width: '1.2em', height: '1.2em' }}>
                    {showPassword ? (
                      <path d="M3.53 2.47a.75.75 0 0 0-1.06 1.06l18 18a.75.75 0 0 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-5.857 12.628 12.628 0 0 0-16.42-7.02L3.53 2.47ZM12 9a3 3 0 0 1 3 3V12a3 3 0 0 1-3 3Z" />
                    ) : (
                      <>
                        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                        <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a.75.75 0 0 1 0-1.113ZM17.25 12a5.25 5.25 0 1 1-10.5 0 5.25 5.25 0 0 1 10.5 0Z" clipRule="evenodd" />
                      </>
                    )}
                  </svg>
                </ShowPasswordButton>
              </InputWrapper>
            </FormGroup>
              <CheckboxWrapper>
                <StyledCheckbox type="checkbox" id="rememberMe" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                <Label htmlFor="rememberMe" style={{ marginBottom: 0, cursor: 'pointer' }}>{t("fields_login.remember_me")}</Label>
              </CheckboxWrapper>
              
              {error && <ErrorMessage>{error}</ErrorMessage>}

              <LoginButton type="submit" disabled={loading}>
                {loading ? t("buttons_login.signing_in") : t("buttons_login.sign_in")}
              </LoginButton>
            </CardBodyStyled>
          </LoginCard>
        </form>
      </FormContainer>
    </LoginWrapper>
  );
}