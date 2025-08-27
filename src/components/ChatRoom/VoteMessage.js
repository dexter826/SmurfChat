import React, { useState, useContext } from 'react';
import { Card, Button, Progress, Typography, Space, message, Popconfirm, Modal, Avatar, List } from 'antd';
import { CheckCircleOutlined, DeleteOutlined, BarChartOutlined, UserOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { castVote, deleteVote } from '../../firebase/services';
import { AuthContext } from '../../Context/AuthProvider';
import useFirestore from '../../hooks/useFirestore';

const { Title, Text } = Typography;

const VoteCardStyled = styled(Card)`
  margin: 8px auto;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  max-width: 60%;
  display: block;
  
  .vote-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  
  .vote-option {
    margin: 8px 0;
    padding: 8px 12px;
    border: 1px solid #d9d9d9;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s;
    
    &:hover {
      border-color: #1890ff;
      background-color: #f0f8ff;
    }
    
    &.selected {
      border-color: #1890ff;
      background-color: #e6f7ff;
    }
    
    &.voted {
      cursor: default;
    }
  }
  
  .vote-stats {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #f0f0f0;
  }
  
  .option-result {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 4px 0;
  }
`;

const VoteMessage = ({ vote }) => {
  const { user: { uid } } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [votersModalVisible, setVotersModalVisible] = useState(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(null);
  
  // Real-time vote data
  const voteCondition = React.useMemo(() => ({
    fieldName: '__name__',
    operator: '==',
    compareValue: vote.id,
  }), [vote.id]);
  
  const voteData = useFirestore('votes', voteCondition)?.[0] || vote;
  
  const userVote = voteData.votes?.[uid];
  const hasVoted = userVote !== undefined;
  
  // Initialize selected options from existing vote
  React.useEffect(() => {
    if (userVote && Array.isArray(userVote)) {
      setSelectedOptions(userVote);
    } else if (userVote !== undefined) {
      setSelectedOptions([userVote]);
    }
  }, [userVote]);
  const isCreator = voteData.createdBy === uid;
  const totalVotes = Object.keys(voteData.votes || {}).length;

  // Get all users for voter information
  const allUsersCondition = React.useMemo(() => ({
    fieldName: 'uid',
    operator: 'in',
    compareValue: Object.keys(voteData.votes || {}),
  }), [voteData.votes]);

  const allUsers = useFirestore('users', Object.keys(voteData.votes || {}).length > 0 ? allUsersCondition : null);

  const handleOptionToggle = async (optionIndex) => {
    if (hasVoted || loading) return;
    
    const newSelectedOptions = selectedOptions.includes(optionIndex)
      ? selectedOptions.filter(idx => idx !== optionIndex)
      : [...selectedOptions, optionIndex];
    
    setSelectedOptions(newSelectedOptions);
    
    // Auto-save vote if there are selected options
    if (newSelectedOptions.length > 0) {
      try {
        setLoading(true);
        await castVote(voteData.id, uid, newSelectedOptions);
        message.success('Đã vote thành công!');
      } catch (error) {
        console.error('Error voting:', error);
        message.error('Có lỗi xảy ra khi vote');
        // Revert selection on error
        setSelectedOptions(selectedOptions);
      } finally {
        setLoading(false);
      }
    }
  };
  

  const handleDelete = async () => {
    try {
      await deleteVote(voteData.id);
      message.success('Đã xóa vote');
    } catch (error) {
      console.error('Error deleting vote:', error);
      message.error('Có lỗi xảy ra khi xóa vote');
    }
  };

  const getOptionVoteCount = (optionIndex) => {
    if (!voteData.votes) return 0;
    return Object.values(voteData.votes).filter(vote => {
      if (Array.isArray(vote)) {
        return vote.includes(optionIndex);
      }
      return vote === optionIndex;
    }).length;
  };
  
  const getOptionPercentage = (optionIndex) => {
    if (totalVotes === 0) return 0;
    const count = getOptionVoteCount(optionIndex);
    return Math.round((count / totalVotes) * 100);
  };

  const getVotersForOption = (optionIndex) => {
    if (!voteData.votes || !allUsers) return [];
    
    const voterIds = Object.entries(voteData.votes)
      .filter(([, vote]) => {
        if (Array.isArray(vote)) {
          return vote.includes(optionIndex);
        }
        return vote === optionIndex;
      })
      .map(([userId]) => userId);
    
    return voterIds.map(userId => {
      const user = allUsers.find(u => u.uid === userId);
      return user || { uid: userId, displayName: 'Unknown User', photoURL: '' };
    });
  };

  const handleShowVoters = (optionIndex) => {
    setSelectedOptionIndex(optionIndex);
    setVotersModalVisible(true);
  };

  return (
    <VoteCardStyled
      size="small"
      title={
        <div className="vote-header">
          <Space>
            <BarChartOutlined style={{ color: '#1890ff' }} />
            <Title level={5} style={{ margin: 0 }}>
              {voteData.title}
            </Title>
          </Space>
          {isCreator && (
            <Popconfirm
              title="Bạn có chắc muốn xóa vote này?"
              onConfirm={handleDelete}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button 
                type="text" 
                danger 
                size="small"
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          )}
        </div>
      }
    >
      {voteData.description && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          {voteData.description}
        </Text>
      )}

      <div>
        {voteData.options?.map((option, index) => (
          <div
            key={index}
            className={`vote-option ${hasVoted ? 'voted' : ''} ${selectedOptions.includes(index) ? 'selected' : ''}`}
            onClick={() => handleOptionToggle(index)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                {(hasVoted && Array.isArray(userVote) ? userVote.includes(index) : userVote === index) && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                {!hasVoted && selectedOptions.includes(index) && <CheckCircleOutlined style={{ color: '#1890ff' }} />}
                <Text>{option}</Text>
              </Space>
              {hasVoted && (
                <Text 
                  type="secondary" 
                  style={{ cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => handleShowVoters(index)}
                >
                  {getOptionVoteCount(index)} vote{getOptionVoteCount(index) !== 1 ? 's' : ''}
                </Text>
              )}
            </div>
            
            {hasVoted && (
              <Progress
                percent={getOptionPercentage(index)}
                size="small"
                showInfo={false}
                strokeColor={(hasVoted && Array.isArray(userVote) ? userVote.includes(index) : userVote === index) ? '#52c41a' : '#1890ff'}
                style={{ marginTop: 4 }}
              />
            )}
          </div>
        ))}
      </div>

      {hasVoted && (
        <div className="vote-stats">
          <Text type="secondary">
            Tổng cộng: {totalVotes} người đã vote • Tạo bởi {voteData.creatorName}
          </Text>
        </div>
      )}
      
      {!hasVoted && (
        <div className="vote-stats">
          <Text type="secondary">
            Chọn một hoặc nhiều lựa chọn • Tạo bởi {voteData.creatorName}
          </Text>
        </div>
      )}
      
      {/* Voters Modal */}
      <Modal
        title={`Người đã vote cho: ${voteData.options?.[selectedOptionIndex]}`}
        visible={votersModalVisible}
        onCancel={() => setVotersModalVisible(false)}
        footer={null}
        width={400}
      >
        <List
          dataSource={selectedOptionIndex !== null ? getVotersForOption(selectedOptionIndex) : []}
          renderItem={(voter) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <Avatar src={voter.photoURL} icon={<UserOutlined />}>
                    {voter.photoURL ? '' : voter.displayName?.charAt(0)?.toUpperCase()}
                  </Avatar>
                }
                title={voter.displayName}
                description={voter.uid === uid ? 'Bạn' : 'Thành viên'}
              />
            </List.Item>
          )}
          locale={{ emptyText: 'Chưa có ai vote cho lựa chọn này' }}
        />
      </Modal>
    </VoteCardStyled>
  );
};

export default VoteMessage;
