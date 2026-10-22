import { createKeyring } from '@pdpa/crypto';
import kms from '@/externals/kms';
import store from './store';

/** Envelope encryption: 1 user = 1 DEK — create / getDek / destroy (crypto-shredding) / rewrapAll (KEK rotation) */
export default createKeyring({ kms, store });
