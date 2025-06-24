import styled from '@emotion/styled';
import { motion } from 'framer-motion';
import React from 'react';


const NavbarContainer = styled(motion.div)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
  background: linear-gradient(to left, #91e7ee, #475bfd);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  color: #f8fafc;
  position: fixed;
  width: 100%;
  top: 0;
  z-index: 1000;
`;

const Logo = styled.div`
  font-size: 24px;
  font-weight: 700;
  display: flex;
  align-items: center;
`;

const MenuButton = styled(motion.div)`
  font-size: 24px;
  color: #f8fafc;
  cursor: pointer;
  padding: 8px;
  transition: transform 0.3s;
  &:hover {
    transform: scale(1.1);
  }
`;


const Navbar = ({ onMenuClick, menuButtonRef }) => {
  return (
    <div className="navbar">
      <div className="logo">
        BRIM AI Tutor
      </div>
      <div className="menu-button" onClick={onMenuClick} ref={menuButtonRef}>
        ☰
      </div>
    </div>
  );
};

export default Navbar;