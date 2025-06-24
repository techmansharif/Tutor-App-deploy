import styled from '@emotion/styled';
import { motion } from 'framer-motion';

const SidebarContainer = styled(motion.div)`
  position: fixed;
  top: 60px;
  right: 0;
  width: 250px;
  height: calc(100vh - 60px);
  background: white;
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
  padding: 16px;
  z-index: 1000;
  border-radius: 8px 0 0 8px;
  overflow-y: auto;
`;

const SidebarLink = styled.a`
  display: block;
  padding: 12px 16px;
  color: #002244;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  border-radius: 4px;
  transition: background 0.3s, color 0.3s;
  &:hover {
    background: #91e7ee;
    color: #002244;
  }
`;

const sidebarVariants = {
  hidden: { x: '100%' },
  visible: { x: 0 },
};

const Sidebar = ({ active, sidebarRef }) => {
  console.log('Sidebar active:', active); // Debug log
  return (
    <SidebarContainer
      ref={sidebarRef}
      variants={sidebarVariants}
      initial="hidden"
      animate={active ? 'visible' : 'hidden'}
      transition={{ duration: 0.3 }}
    >
      <SidebarLink href="/assess">ASSESSMENT</SidebarLink>
      <SidebarLink href="/subject">SUBJECT</SidebarLink>
      <SidebarLink href="/explain">EXPLAIN</SidebarLink>
      <SidebarLink href="/assess">PRACTICE</SidebarLink>
      <SidebarLink href="/assess">QUIZ</SidebarLink>
      <SidebarLink href="#">PROGRESS</SidebarLink>
      <SidebarLink href="/">LOGOUT</SidebarLink>
    </SidebarContainer>
  );
};

export default Sidebar;