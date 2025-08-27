import React, { useContext } from 'react';
import { Row, Col } from 'antd';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import ConversationWindow from './ConversationWindow';
import { AppContext } from '../../Context/AppProvider';

export default function ChatRoom() {
  const { chatType } = useContext(AppContext);

  return (
    <div>
      <Row>
        <Col span={6}>
          <Sidebar />
        </Col>
        <Col span={18}>
          {chatType === 'room' ? <ChatWindow /> : <ConversationWindow />}
        </Col>
      </Row>
    </div>
  );
}
