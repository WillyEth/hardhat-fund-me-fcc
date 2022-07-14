const { inputToConfig } = require("@ethereum-waffle/compiler")
const { EtherscanProvider } = require("@ethersproject/providers")
const { assert, expect } = require("chai")
const { deployments, ethers, getNamedAccounts } = require("hardhat")

describe("Fundme", async function () {
  let fundMe
  let deployer
  let mockV3Aggegator
  const sendValue = ethers.utils.parseEther("1")
  beforeEach(async function () {
    deployer = (await getNamedAccounts()).deployer
    await deployments.fixture(["all"])
    fundMe = await ethers.getContract("FundMe", deployer)
    mockV3Aggegator = await ethers.getContract("MockV3Aggregator", deployer)
  })

  describe("constructor", async function () {
    it("sets the aggregator address correctly", async function () {
      const response = await fundMe.priceFeed()
      assert.equal(response, mockV3Aggegator.address)
    })
  })

  describe("fund", async function () {
    it("it fails if you dont send another eth", async function () {
      await expect(fundMe.fund()).to.be.reverted
    })
    it("it updates the amount funded data structure", async function () {
      await fundMe.fund({ value: sendValue })
      const response = await fundMe.addressToAmountFunded(deployer)
      assert.equal(response.toString(), sendValue.toString())
    })
    it("adds funder to array of funders", async function () {
      await fundMe.fund({ value: sendValue })
      const funder = await fundMe.funders(0)
      assert.equal(funder, deployer)
    })

    describe("withdraw", async function () {
      beforeEach(async function () {
        await fundMe.fund({ value: sendValue })
      })

      it(" withdraw eth from single  funder", async function () {
        const startingFundMeBalance = await fundMe.provider.getBalance(
          fundMe.address
        )
        const startingDeployerBalance = await fundMe.provider.getBalance(
          deployer
        )
        const transactionResponse = await fundMe.withdraw()
        const transactionReceipt = await transactionResponse.wait(1)
        const { gasUsed, effectiveGasPrice } = transactionReceipt
        const gasCost = gasUsed.mul(effectiveGasPrice)
        const endingFundMeBalance = await fundMe.provider.getBalance(
          fundMe.address
        )
        const endingDeployerBalance = await fundMe.provider.getBalance(deployer)

        assert.equal(endingFundMeBalance, 0)
        assert.equal(
          startingFundMeBalance.add(startingDeployerBalance).toString,
          endingDeployerBalance.add(gasCost).toString
        )
      })
      it("Test 10 is allows us to withdraw with multiple funders", async () => {
        // Arrange
        const accounts = await ethers.getSigners()
        for (i = 1; i < 6; i++) {
          const fundMeConnectedContract = await fundMe.connect(accounts[i])
          await fundMeConnectedContract.fund({ value: sendValue })
        }
        const startingFundMeBalance = await fundMe.provider.getBalance(
          fundMe.address
        )
        const startingDeployerBalance = await fundMe.provider.getBalance(
          deployer
        )

        // Act
        //const transactionResponse = await fundMe.cheaperWithdraw()
        // Let's comapre gas costs :)
        const transactionResponse = await fundMe.withdraw()
        const transactionReceipt = await transactionResponse.wait()
        const { gasUsed, effectiveGasPrice } = transactionReceipt
        const withdrawGasCost = gasUsed.mul(effectiveGasPrice)
        console.log(`GasCost: ${withdrawGasCost}`)
        console.log(`GasUsed: ${gasUsed}`)
        console.log(`GasPrice: ${effectiveGasPrice}`)
        const endingFundMeBalance = await fundMe.provider.getBalance(
          fundMe.address
        )
        const endingDeployerBalance = await fundMe.provider.getBalance(deployer)
        // Assert
        assert.equal(
          startingFundMeBalance.add(startingDeployerBalance).toString(),
          endingDeployerBalance.add(withdrawGasCost).toString()
        )
        // Make a getter for storage variables
        await expect(fundMe.funders(0)).to.be.reverted

        for (i = 1; i < 6; i++) {
          assert.equal(
            await fundMe.addressToAmountFunded(accounts[i].address),
            0
          )
        }
      })

      it("Only allows the owner to withdraw", async function () {
        const accounts = await ethers.getSigners()
        const fundMeConnectedContract = await fundMe.connect(accounts[1])
        await expect(fundMeConnectedContract.withdraw()).to.be.revertedWith(
          "Fundme_NotOwner"
        )
      })
      it("Test 11 is allows us to cheaperWithdraw with multiple funders", async () => {
        // Arrange
        const accounts = await ethers.getSigners()
        for (i = 1; i < 6; i++) {
          const fundMeConnectedContract = await fundMe.connect(accounts[i])
          await fundMeConnectedContract.fund({ value: sendValue })
        }
        const startingFundMeBalance = await fundMe.provider.getBalance(
          fundMe.address
        )
        const startingDeployerBalance = await fundMe.provider.getBalance(
          deployer
        )

        // Act
        //const transactionResponse = await fundMe.cheaperWithdraw()
        // Let's comapre gas costs :)
        const transactionResponse = await fundMe.cheaperWithdraw()
        const transactionReceipt = await transactionResponse.wait()
        const { gasUsed, effectiveGasPrice } = transactionReceipt
        const withdrawGasCost = gasUsed.mul(effectiveGasPrice)
        //        console.log(`GasCost: ${withdrawGasCost}`)
        //        console.log(`GasUsed: ${gasUsed}`)
        //       console.log(`GasPrice: ${effectiveGasPrice}`)
        const endingFundMeBalance = await fundMe.provider.getBalance(
          fundMe.address
        )
        const endingDeployerBalance = await fundMe.provider.getBalance(deployer)
        // Assert
        assert.equal(
          startingFundMeBalance.add(startingDeployerBalance).toString(),
          endingDeployerBalance.add(withdrawGasCost).toString()
        )
        // Make a getter for storage variables
        //await expect(fundMe.funders(0)).to.be.reverted

        for (i = 1; i < 6; i++) {
          assert.equal(
            await fundMe.addressToAmountFunded(accounts[i].address),
            0
          )
        }
      })
    })
  })
})
