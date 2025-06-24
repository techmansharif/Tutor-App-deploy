import styled from '@emotion/styled';

const AIChatContainer = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 12px 16px;
  background: #fff;
  border-top: 2px solid #2e9afe;
  border-radius: 0;
  display: flex;
  gap: 8px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  z-index: 900;
`;

const Input = styled.input`
  flex: 1;
  padding: 12px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s;
  &:focus {
    outline: none;
    border-color: #475bfd;
    box-shadow: 0 0 0 3px rgba(71, 91, 253, 0.2);
  }
`;

const Typing = styled.span`
  font-size: 14px;
  color: #0070c0;
  margin-left: 8px;
  animation: blink 1s infinite;
`;

const Button = styled.button`
  padding: 12px 20px;
  border: none;
  background-color: #475bfd;
  color: #f8fafc;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: transform 0.3s, background 0.3s;
  &:hover {
    transform: translateY(-2px);
    background-color: #3646e0;
  }
`;

const AIChat = ({ askAI, isTyping }) => (
  <AIChatContainer>
    <Input className="ai-chat-input" type="text" placeholder="Ask a question..." />
    <Button onClick={askAI}>Ask AI</Button>
    {isTyping && <Typing className="typing">AI is thinking...</Typing>}
  </AIChatContainer>
);

export default AIChat;