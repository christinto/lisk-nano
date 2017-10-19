import io from './socketShim';
import actionTypes from './../constants/actions';
import { SYNC_ACTIVE_INTERVAL, SYNC_INACTIVE_INTERVAL } from './../constants/api';

const shouldUpdateAccount = (accountAddress, transactions) => {
  const transaction = transactions[transactions.length - 1];
  const sender = transaction ? transaction.senderId : null;
  const receiver = transaction ? transaction.receiverId : null;
  return accountAddress === receiver || accountAddress === sender;
};

const socketSetup = (store) => {
  let interval = SYNC_ACTIVE_INTERVAL;

  const { ipc } = window;
  if (ipc) {
    ipc.on('blur', () => {
      interval = SYNC_INACTIVE_INTERVAL;
    });
    ipc.on('focus', () => {
      interval = SYNC_ACTIVE_INTERVAL;
    });
  }
  const connection = io.connect(`ws://${store.getState().peers.data.options.address}`);
  connection.on('blocks/change', (block) => {
    if (shouldUpdateAccount(store.getState().account.address, block.transactions)) {
      store.dispatch({
        type: actionTypes.relevantBlockAdded,
        data: { data: block, interval },
      });
    }
  });
  // TODO: cover other cases, like e.g. connection failed, is interrupted..
};

export { shouldUpdateAccount, socketSetup };
