import { ethers } from 'hardhat';
import { deployLogger } from './deploy.logger';

export interface DeployFuncParamsInterface {
	contractName: string;
	contractParams?: any[];
}

export interface DeployFuncOptionsInterface {
	verbose?: boolean;
}

export const simpleDeployFunc = async (
	{ contractName, contractParams = [] }: DeployFuncParamsInterface,
	options: DeployFuncOptionsInterface = {}
) => {
	const { verbose = true } = options;

	try {
		const log = (...args) => {
			verbose && console.log(...args);
		};

		console.log('============');
		const Factory = await ethers.getContractFactory(contractName);

		log(`Start deploy ${contractName}`);

		const contract = await Factory.deploy(...contractParams);
		await contract.deployed();
		deployLogger({ instance: contract, contractName }, { verbose });
		console.log('============');

		return {
			[contractName]: contract,
		};
	} catch (error) {
		console.error(`Error when deploying contract ${contractName}: `, error);
		process.exit(1);
	}
};
