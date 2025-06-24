import styled from '@emotion/styled';

const StatusContainer = styled.div`
  text-align: center;
  font-size: 12px;
  margin: 16px auto;
  padding: 8px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  max-width: 800px;
`;

const Status = () => (
  <StatusContainer>Status: Logged in as naz...@gmail.com</StatusContainer>
);

export default Status;