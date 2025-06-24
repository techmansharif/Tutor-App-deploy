import styled from '@emotion/styled';

const TitleContainer = styled.div`
  text-align: center;
  margin: 80px 16px 24px;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  animation: fadeIn 0.5s ease-in;
`;

const TitleSection = () => (
  <TitleContainer>
    <h2>English</h2>
    <div className="subtitle">Completing Stories</div>
    <div>Story Structure and Techniques</div>
  </TitleContainer>
);

export default TitleSection;