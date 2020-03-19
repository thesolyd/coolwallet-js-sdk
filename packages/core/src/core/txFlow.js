import * as rlp from 'rlp';
import * as txUtil from './txUtil';
import { sayHi } from '../apdu/control';

/**
 * @description Prepare RLP Data for CoolWallet
 * @param {String} keyId hex string
 * @param {Buffer|Array<Buffer>} rawData - signMessage: payload, signTransaction: rawPayload
 * @param {String} readType
 * @return {String} Hex input data for 8032 txPrep
 */
export const prepareSEData = (keyId, rawData, readType) => {
  const inputIdBuffer = Buffer.from('00', 'hex');
  const signDataBuffer = Buffer.from('00', 'hex');
  const readTypeBuffer = Buffer.from(readType, 'hex');
  const keyIdBuffer = Buffer.from(keyId, 'hex');

  const data = [inputIdBuffer, signDataBuffer, readTypeBuffer, keyIdBuffer, rawData];
  const dataForSE = rlp.encode(data);
  return dataForSE.toString('hex');
};

/**
 * @description Send Data to CoolWallet
 * @param {Transport} transport
 * @param {String} appId
 * @param {String} appPrivateKey
 * @param {String} txDataHex for SE (output of prepareSEData)
 * @param {String} txDataType hex string
 * @param {Boolean} isEDDSA
 * @param {Function} preAction
 * @param {Function} txPrepareCompleteCallback notify app to show the tx info
 * @param {Function} authorizedCallback notify app to close the tx info
 * @param {Boolean} return_canonical
 * @return {Promise< {r: string, s: string} | string | Buffer }>}
 */
export const sendDataToCoolWallet = async (
  transport,
  appId,
  appPrivateKey,
  txDataHex,
  txDataType,
  isEDDSA = false,
  preAction = null,
  txPrepareCompleteCallback = null,
  authorizedCallback = null,
  return_canonical = true
) => {
  await sayHi(transport, appId);

  if (typeof preAction === 'function') await preAction();

  const encryptedSignature = await txUtil.getSingleEncryptedSignature(
    transport,
    txDataHex,
    txDataType,
    appPrivateKey,
    txPrepareCompleteCallback
  );
  const signatureKey = await txUtil.getCWSEncryptionKey(transport, authorizedCallback);

  const signature = txUtil.decryptSignatureFromSE(
    encryptedSignature,
    signatureKey,
    isEDDSA,
    return_canonical
  );
  return signature;
};

/**
 * @description Send Data Array to CoolWallet
 * @param {Transport} transport
 * @param {String} appId
 * @param {String} appPrivateKey
 * @param {Array<{txDataHex:String, txDataType:String}>} txDataArray
 * @param {Boolean} isEDDSA
 * @param {Function} txPrepareCompleteCallback notify app to show the tx info
 * @param {Function} authorizedCallback notify app to close the tx info
 * @param {Boolean} return_canonical
 * @return {Promise<Array<{r: string, s: string} | string | Buffer }>>}
 */
export const sendDataArrayToCoolWallet = async (
  transport,
  appId,
  appPrivateKey,
  txDataArray,
  isEDDSA = false,
  txPrepareCompleteCallback = null,
  authorizedCallback = null,
  return_canonical = true
) => {
  await sayHi(transport, appId);

  const encryptedSignatureArray = await txUtil.getEncryptedSignatures(
    transport,
    txDataArray,
    appPrivateKey,
    txPrepareCompleteCallback
  );
  const signatureKey = await txUtil.getCWSEncryptionKey(transport, authorizedCallback);

  const signatures = encryptedSignatureArray.map(
    (encryptedSignature) => txUtil.decryptSignatureFromSE(
      encryptedSignature,
      signatureKey,
      isEDDSA,
      return_canonical
    )
  );
  return signatures;
};
