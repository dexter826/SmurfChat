import React, { useState, useContext } from 'react';
import { Card, Button, Progress, Typography, Space, message, Popconfirm } from 'antd';
import { CheckCircleOutlined, DeleteOutlined, BarChartOutlined } from '@ant-design/icons';
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

  const handleOptionToggle = (optionIndex) => {
    if (hasVoted || loading) return;
    
    setSelectedOptions(prev => {
      if (prev.includes(optionIndex)) {
        return prev.filter(idx => idx !== optionIndex);
      } else {
        return [...prev, optionIndex];
      }
    });
  };
  
  const handleSubmitVote = async () => {
    if (hasVoted || loading || selectedOptions.length === 0) return;
    
    try {
      setLoading(true);
      await castVote(voteData.id, uid, selectedOptions);
      message.success('Đã vote thành công!');
    } catch (error) {
      console.error('Error voting:', error);
      message.error('Có lỗi xảy ra khi vote');
    } finally {
      setLoading(false);
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
                <Text type="secondary">
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary">
              Chọn một hoặc nhiều lựa chọn • Tạo bởi {voteData.creatorName}
            </Text>
            {selectedOptions.length > 0 && (
              <Button 
                type="primary" 
                size="small"
                loading={loading}
                onClick={handleSubmitVote}
              >
                Vote ({selectedOptions.length})
              </Button>
            )}
          </div>
        </div>
      )}
    </VoteCardStyled>
  );
};

export default VoteMessage;
