import styled from '@emotion/styled';

const ButtonGroupContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin: 16px;
  flex-wrap: wrap;
`;

const Button = styled.button`
  flex: 1;
  min-width: 120px;
  padding: 12px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.3s, background 0.3s;
`;

const ButtonGroup = () => (
  <ButtonGroupContainer>
    <Button className="btn btn-yellow">Proceed</Button>
    <Button className="btn btn-blue">Explain again (AI)</Button>
    <Button className="btn btn-red">Refresh Screen</Button>
  </ButtonGroupContainer>
);

export default ButtonGroup;