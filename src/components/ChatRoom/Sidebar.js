import React, { useContext } from 'react';
import { Row, Col, Tabs } from 'antd';
import { MessageOutlined, TeamOutlined } from '@ant-design/icons';
import UserInfo from './UserInfo';
import RoomList from './RoomList';
import DirectMessageList from './DirectMessageList';
import { AppContext } from '../../Context/AppProvider';
import styled from 'styled-components';

const { TabPane } = Tabs;

const SidebarStyled = styled.div`
  background: #3f0e40;
  color: white;
  height: 100vh;

  .ant-tabs {
    .ant-tabs-tab {
      color: white !important;
      
      &.ant-tabs-tab-active {
        .ant-tabs-tab-btn {
          color: #1890ff !important;
        }
      }
    }
    
    .ant-tabs-ink-bar {
      background: #1890ff;
    }
    
    .ant-tabs-content-holder {
      padding: 0;
    }
  }
`;

export default function Sidebar() {
  const { chatType, setChatType, setSelectedRoomId, setSelectedConversationId } = useContext(AppContext);

  const handleTabChange = (activeKey) => {
    setChatType(activeKey);
    if (activeKey === 'room') {
      setSelectedConversationId('');
    } else {
      setSelectedRoomId('');
    }
  };

  return (
    <SidebarStyled>
      <Row>
        <Col span={24}>
          <UserInfo />
        </Col>
        <Col span={24}>
          <Tabs 
            activeKey={chatType} 
            onChange={handleTabChange}
            size="small"
            centered
          >
            <TabPane 
              tab={
                <span>
                  <TeamOutlined />
                  Phòng
                </span>
              } 
              key="room"
            >
              <RoomList />
            </TabPane>
            <TabPane 
              tab={
                <span>
                  <MessageOutlined />
                  Tin nhắn
                </span>
              } 
              key="direct"
            >
              <DirectMessageList />
            </TabPane>
          </Tabs>
        </Col>
      </Row>
    </SidebarStyled>
  );
}
