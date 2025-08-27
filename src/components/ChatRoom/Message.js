import React from 'react';
import { Avatar, Typography } from 'antd';
import styled from 'styled-components';
import { formatRelative } from 'date-fns/esm';
import { AuthContext } from '../../Context/AuthProvider';

const WrapperStyled = styled.div`
  margin-bottom: 10px;
  display: flex;
  flex-direction: ${props => props.isOwn ? 'row-reverse' : 'row'};
  align-items: flex-start;
  
  .message-container {
    display: flex;
    flex-direction: column;
    max-width: 70%;
    margin: ${props => props.isOwn ? '0 8px 0 0' : '0 0 0 8px'};
  }
  
  .message-header {
    display: flex;
    align-items: center;
    margin-bottom: 4px;
    flex-direction: ${props => props.isOwn ? 'row-reverse' : 'row'};
  }

  .author {
    margin: ${props => props.isOwn ? '0 0 0 5px' : '0 5px 0 0'};
    font-weight: bold;
    font-size: 12px;
  }

  .date {
    font-size: 10px;
    color: #a7a7a7;
  }

  .content {
    background: ${props => props.isOwn ? '#1890ff' : '#f0f0f0'};
    color: ${props => props.isOwn ? 'white' : 'black'};
    padding: 8px 12px;
    border-radius: 18px;
    ${props => props.isOwn ? 'border-top-right-radius: 4px;' : 'border-top-left-radius: 4px;'}
    word-wrap: break-word;
    max-width: 100%;
  }
`;

function formatDate(seconds) {
  let formattedDate = '';

  if (seconds) {
    formattedDate = formatRelative(new Date(seconds * 1000), new Date());

    formattedDate =
      formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
  }

  return formattedDate;
}

export default function Message({ text, displayName, createdAt, photoURL, uid }) {
  const { user } = React.useContext(AuthContext);
  const isOwn = uid === user?.uid;
  return (
    <WrapperStyled isOwn={isOwn}>
      <Avatar size='small' src={photoURL}>
        {photoURL ? '' : displayName?.charAt(0)?.toUpperCase()}
      </Avatar>
      <div className='message-container'>
        <div className='message-header'>
          <Typography.Text className='author'>{displayName}</Typography.Text>
          <Typography.Text className='date'>
            {formatDate(createdAt?.seconds)}
          </Typography.Text>
        </div>
        <div className='content'>
          <Typography.Text style={{ color: 'inherit' }}>{text}</Typography.Text>
        </div>
      </div>
    </WrapperStyled>
  );
}
