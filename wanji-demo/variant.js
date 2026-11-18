'use strict';
// Review links can open the exact state without changing the original demo.
const reviewState=new URLSearchParams(location.search);
if(reviewState.get('stage')==='1'){
 openStage(0);
 const requestedTopic=Number(reviewState.get('topic'));
 if(reviewState.has('topic')&&Number.isInteger(requestedTopic)&&requestedTopic>=0&&requestedTopic<3){state.topic=requestedTopic;renderDetail();}
}
