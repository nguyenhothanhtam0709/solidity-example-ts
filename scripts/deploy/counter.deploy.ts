import { ethers } from 'hardhat';
import { simpleDeployFunc } from './helpers/deploy.base';

export const deployCounter = async () => {
	try {
		simpleDeployFunc({ contractName: 'Counter' });
	} catch (error) {
		console.error(error);
	}
};
