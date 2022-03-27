import { ethers } from 'hardhat';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { solidity } from 'ethereum-waffle';
import { Purchase } from '../typechain/Purchase';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { sleep } from '../helpers/timer';

chai.use(solidity);
chai.use(chaiAsPromised);
const { expect } = chai;

describe('Purchase', () => {
	let purchase: Purchase;
	let signers: SignerWithAddress[];

	const getPurchaseContract = async (signer: SignerWithAddress) =>
		(await ethers.getContractAt(
			'Purchase',
			purchase.address,
			signer
		)) as Purchase;

	const confirmPurchase = async (signer: SignerWithAddress, value: number) => {
		const purchaseContract = await getPurchaseContract(signer);
		return await purchaseContract.confirmPurchase({
			value,
		});
	};

	const deployPurchase = async (signer: SignerWithAddress, value: number) => {
		const factory = await ethers.getContractFactory('Purchase', signer);
		purchase = (await factory.deploy({ value })) as Purchase;
		await purchase.deployed();
	};

	before(async () => {
		signers = await ethers.getSigners();
	});

	describe('seller', async () => {
		it('value must be an even number', async () => {
			const value = 5;
			await deployPurchase(signers[0], value * 2);
			expect(await purchase.value()).to.eq(value);
			expect(await purchase.seller()).to.eq(signers[0].address);
		});

		it('value cannot be an odd number', async () => {
			await expect(deployPurchase(signers[0], 9)).to.be.rejectedWith(
				'ValueNotEven'
			);
		});
	});

	describe('seller 2', async () => {
		const value = 5;
		beforeEach(async () => {
			await deployPurchase(signers[0], value * 2);
		});

		it('should abort purchase 1', async () => {
			const provider = ethers.provider;

			await expect(purchase.abort()).to.emit(purchase, 'Aborted');
			expect(await provider.getBalance(purchase.address)).to.eq(0);
		});

		it('should abort purchase 2', async () => {
			const provider = ethers.provider;
			const balance = await provider.getBalance(purchase.address);

			await expect(purchase.abort).to.changeEtherBalance(signers[0], balance);
			expect(await provider.getBalance(purchase.address)).to.eq(0);
		});

		it('seller cannot confirm receive', async () => {});
	});

	describe('buyer', async () => {
		const value = 5;
		beforeEach(async () => {
			await deployPurchase(signers[0], value * 2);
		});

		it('buyer value cannot be an odd number', async () => {
			await expect(confirmPurchase(signers[1], 9)).to.be.rejectedWith();
		});

		it('buyer value must be equal to seller value', async () => {
			await expect(confirmPurchase(signers[1], 12)).to.be.rejectedWith();
		});

		it('buyer cannot abort purchase', async () => {
			const purchaseContract = await getPurchaseContract(signers[1]);
			await expect(purchaseContract.abort()).to.rejectedWith('OnlySeller');
		});

		it('should confirm purchase', async () => {
			await expect(confirmPurchase(signers[1], value * 2)).to.emit(
				purchase,
				'PurchaseConfirmed'
			);

			expect(await purchase.buyer()).to.eq(signers[1].address);
		});

		it('should confirm received', async () => {
			await expect(confirmPurchase(signers[1], value * 2)).to.emit(
				purchase,
				'PurchaseConfirmed'
			);

			const purchaseContract = await getPurchaseContract(signers[1]);
			await expect(purchaseContract.confirmReceived).to.changeEtherBalance(
				signers[1],
				value
			);
		});
	});

	describe('purchase', async () => {
		const value = 5;

		beforeEach(async () => {
			await deployPurchase(signers[0], value * 2);

			await confirmPurchase(signers[1], value * 2);
		});

		it('seller should refund', async () => {
			const purchaseContract = await getPurchaseContract(signers[1]);
			await purchaseContract.confirmReceived();

			await expect(purchase.refundSeller).to.changeEtherBalance(
				signers[0],
				value * 3
			);
		});

		it('seller cannot abort confirmed purchase', async () => {
			await expect(purchase.abort()).to.be.rejectedWith('InvalidState');
		});
	});
});
