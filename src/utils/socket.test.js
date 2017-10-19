import { expect } from 'chai';
import { spy } from 'sinon';
import io from './socketShim';
import actionTypes from './../constants/actions';
import { SYNC_ACTIVE_INTERVAL, SYNC_INACTIVE_INTERVAL } from './../constants/api';
import { socketSetup, shouldUpdateAccount } from './socket';

describe('Socket', () => {
  // TODO: running only 'Socket' results in green tests, running everything not
  let store;
  let transactions;
  const ipcCallbacks = {};
  const socketCallbacks = {};

  beforeEach(() => {
    io.connect = () => ({
      on: (event, callback) => {
        socketCallbacks[event] = callback;
      },
    });

    window.ipc = {
      on: (event, callback) => {
        ipcCallbacks[event] = callback;
      },
    };
  });

  describe('should tell if the account should be updated', () => {
    it('should update when the account is the sender', () => {
      const address = '1234';
      transactions = [{ senderId: '1234', receiverId: '5678' }];
      expect(shouldUpdateAccount(address, transactions)).to.equal(true);
    });

    it('should update when the account is the receiver', () => {
      const address = '1234';
      transactions = [{ senderId: '5678', receiverId: '1234' }];
      expect(shouldUpdateAccount(address, transactions)).to.equal(true);
    });

    it('should not update when the account is neither sender or receiver', () => {
      const address = '1234';
      transactions = [{ senderId: '5678', receiverId: '9182' }];
      expect(shouldUpdateAccount(address, transactions)).to.equal(false);
    });
  });

  it(`should dispatch ${actionTypes.relevantBlockAdded} when a new relevant block was added`, () => {
    transactions = { transactions: [{ senderId: '1234', receiverId: '5678' }] };
    store = {
      getState: () => ({
        peers: { data: { options: { address: 'localhost:4000' } } },
        account: { address: '1234' },
      }),
      dispatch: spy(),
    };

    socketSetup(store);
    ipcCallbacks.focus();
    socketCallbacks['blocks/change'](transactions);

    expect(store.dispatch).to.have.been.calledWith({
      type: actionTypes.relevantBlockAdded,
      data: { data: transactions, interval: SYNC_ACTIVE_INTERVAL },
    });
  });

  it(`should not dispatch ${actionTypes.relevantBlockAdded} when no relevant block was added`, () => {
    transactions = { transactions: [{ senderId: '9283', receiverId: '5678' }] };
    store = {
      getState: () => ({
        peers: { data: { options: { address: 'localhost:4000' } } },
        account: { address: '1234' },
      }),
      dispatch: spy(),
    };

    socketSetup(store);

    expect(store.dispatch).to.not.have.been.calledWith();
  });

  describe('window.ipc', () => {
    beforeEach(() => {
      transactions = { transactions: [{ senderId: '1234', receiverId: '5678' }] };
      store = {
        getState: () => ({
          peers: { data: { options: { address: 'localhost:4000' } } },
          account: { address: '1234' },
        }),
        dispatch: spy(),
      };
    });

    it('should call window.ipc.on(\'blur\') and window.ipc.on(\'focus\')', () => {
      window.ipc = {
        on: spy(),
      };
      socketSetup(store);

      expect(window.ipc.on).to.have.been.calledWith('blur');
      expect(window.ipc.on).to.have.been.calledWith('focus');
    });

    it('should set window.ipc to set the interval to SYNC_INACTIVE_INTERVAL on blur', () => {
      socketSetup(store);
      ipcCallbacks.blur();
      socketCallbacks['blocks/change'](transactions);

      expect(store.dispatch).to.have.been.calledWith({
        type: actionTypes.relevantBlockAdded,
        data: { data: transactions, interval: SYNC_INACTIVE_INTERVAL },
      });
    });

    it('should set window.ipc to set the interval to SYNC_ACTIVE_INTERVAL on focus', () => {
      socketSetup(store);
      ipcCallbacks.focus();
      socketCallbacks['blocks/change'](transactions);

      expect(store.dispatch).to.have.been.calledWith({
        type: actionTypes.relevantBlockAdded,
        data: { data: transactions, interval: SYNC_ACTIVE_INTERVAL },
      });
    });
  });
});

