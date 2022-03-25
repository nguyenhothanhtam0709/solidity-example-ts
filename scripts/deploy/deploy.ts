import { ethers } from 'hardhat';
import { deployCounter } from './counter.deploy';

const deploy = async () => {
	const [deployer] = await ethers.getSigners(); // get accounts

	console.log(`using account ${deployer.address}`);

	await deployCounter();
};

deploy();
