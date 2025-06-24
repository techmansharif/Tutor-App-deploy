import React, { useState, useEffect } from 'react';
import { css } from '@emotion/react';
import styled from '@emotion/styled';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar.jsx';
import Sidebar from '../components/Sidebar';
import TitleSection from '../components/TitleSection';
import ButtonGroup from '../components/ButtonGroup';
import Container from '../components/Container';
import AIChat from '../components/AIChat';
import Status from '../components/Status';

const AppContainer = styled.div`
  margin: 0;
  font-family: 'Inter', system-ui, Arial, sans-serif;
  background-color: #fdfdfd;
  color: #0070c0;
  min-height: 100vh;
  line-height: 1.6;
  overflow-x: hidden;
`;

const Explain = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = (e) => {
    e.stopPropagation();
    setIsSidebarOpen(!isSidebarOpen);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      const sidebar = document.getElementById('sidebar');
      const menuButton = document.querySelector('.menu-button');
      const sidebarToggle = document.querySelector('.sidebar-toggle');
      if (isSidebarOpen && !sidebar.contains(e.target) && !menuButton.contains(e.target) && !sidebarToggle.contains(e.target)) {
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isSidebarOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 's') toggleSidebar(e);
      if (e.ctrlKey && e.key === 'a') document.querySelector('.ai-chat-input').focus();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [isTyping, setIsTyping] = useState(false);

  const askAI = () => {
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 2000);
  };

  return (
    <AppContainer>
      <Navbar toggleSidebar={toggleSidebar} />
      <div className="sidebar-toggle" onClick={toggleSidebar}>☰</div>
      <AnimatePresence>
        {isSidebarOpen && (
          <Sidebar key="sidebar" />
        )}
      </AnimatePresence>
      <TitleSection />
      <ButtonGroup />
      <Container />
      <AIChat askAI={askAI} isTyping={isTyping} />
      <Status />
    </AppContainer>
  );
};

export default Explain;