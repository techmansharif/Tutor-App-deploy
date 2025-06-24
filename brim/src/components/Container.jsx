import styled from '@emotion/styled';

const ContainerDiv = styled.div`
  max-width: 800px;
  margin: 16px auto;
  padding: 0;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: grid;
  grid-template-areas: "content";
`;

const Content = styled.div`
  grid-area: content;
  min-height: 200px;
  padding: 16px;
  overflow-y: auto;
  border: 2px solid #2e9afe;
  background-color: #f5f5f5;
  border-radius: 8px;
  position: relative;
`;

const AudioControls = styled.div`
  text-align: center;
  margin: 12px 0;
  display: flex;
  justify-content: center;
  gap: 12px;
`;

const AudioButton = styled.button`
  font-size: 20px;
  padding: 12px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  width: 50px;
  height: 50px;
  transition: transform 0.3s;
  &:hover {
    transform: scale(1.1);
  }
`;

const Container = () => (
  <ContainerDiv>
    <Content>
      <AudioControls>
        <AudioButton className="play">▶</AudioButton>
        <AudioButton className="stop">⏹</AudioButton>
        <AudioButton className="prev">⏮</AudioButton>
      </AudioControls>
      <div>Okay, let's learn about "The Seven Sticks" story! I'll make it easy and fun.

1. The Story Starts:*
Imagine a really, really old farmer. He had seven sons! He was getting old and thought he might die soon.

2. The Bundle of Sticks:*
He asked for a bunch of sticks. Seven of them! Someone tied them all together in a bundle (a group tied together).

3. Try to Break It!*
The farmer gave the bundle to his oldest son. He said, "Try to break this!" The son tried really hard, but he couldn't. It was too strong! Each of the other sons tried too, but nobody could break the whole bundle.

4. Untie Them!*
The farmer smiled. He said, "Okay, now untie the bundle." So, they untied the sticks. Each son got one stick.

5. Break a Single Stick!*
The farmer said, "Now break your stick!" This </div>
    </Content>
  </ContainerDiv>
);

export default Container;