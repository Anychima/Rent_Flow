import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { RentflowCore } from "../target/types/rentflow_core";
import { assert } from "chai";

describe("rentflow-core", () => {
  // Configure the client to use the devnet cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.RentflowCore as Program<RentflowCore>;

  // Test accounts
  const manager = Keypair.generate();
  const tenant = Keypair.generate();
  
  const leaseId = "test-lease-" + Date.now();
  const leaseHash = Buffer.from("a".repeat(64), "hex");
  const monthlyRent = new anchor.BN(2500_000000); // 2500 USDC
  const securityDeposit = new anchor.BN(5000_000000); // 5000 USDC
  
  const now = Math.floor(Date.now() / 1000);
  const startDate = new anchor.BN(now);
  const endDate = new anchor.BN(now + 365 * 24 * 60 * 60); // 1 year later

  let leasePDA: PublicKey;
  let leaseBump: number;

  before(async () => {
    // Airdrop SOL to test accounts
    const airdropManager = await provider.connection.requestAirdrop(
      manager.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropManager);

    const airdropTenant = await provider.connection.requestAirdrop(
      tenant.publicKey,
      1 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropTenant);

    // Derive PDA for lease account
    [leasePDA, leaseBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("lease"), Buffer.from(leaseId)],
      program.programId
    );

    console.log("Test Setup Complete");
    console.log("  Manager:", manager.publicKey.toBase58());
    console.log("  Tenant:", tenant.publicKey.toBase58());
    console.log("  Lease PDA:", leasePDA.toBase58());
  });

  it("Initializes a lease", async () => {
    await program.methods
      .initializeLease(
        leaseId,
        Array.from(leaseHash),
        tenant.publicKey,
        monthlyRent,
        securityDeposit,
        startDate,
        endDate
      )
      .accounts({
        lease: leasePDA,
        manager: manager.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([manager])
      .rpc();

    // Fetch and verify lease account
    const leaseAccount = await program.account.lease.fetch(leasePDA);
    
    assert.equal(leaseAccount.leaseId, leaseId);
    assert.equal(leaseAccount.managerWallet.toBase58(), manager.publicKey.toBase58());
    assert.equal(leaseAccount.tenantWallet.toBase58(), tenant.publicKey.toBase58());
    assert.equal(leaseAccount.monthlyRent.toNumber(), monthlyRent.toNumber());
    assert.equal(leaseAccount.securityDeposit.toNumber(), securityDeposit.toNumber());
    assert.isFalse(leaseAccount.managerSigned);
    assert.isFalse(leaseAccount.tenantSigned);
    
    console.log("✅ Lease initialized successfully");
  });

  it("Manager signs the lease", async () => {
    const managerSignatureHash = Buffer.from("manager_sig".repeat(3), "utf8");

    await program.methods
      .signLease(Array.from(managerSignatureHash.slice(0, 32)))
      .accounts({
        lease: leasePDA,
        signer: manager.publicKey,
      })
      .signers([manager])
      .rpc();

    const leaseAccount = await program.account.lease.fetch(leasePDA);
    
    assert.isTrue(leaseAccount.managerSigned);
    assert.isFalse(leaseAccount.tenantSigned);
    
    // Lease should still be pending (only one signature)
    assert.deepEqual(leaseAccount.status, { pending: {} });

    console.log("✅ Manager signed lease");
  });

  it("Tenant signs the lease and activates it", async () => {
    const tenantSignatureHash = Buffer.from("tenant_sig".repeat(3), "utf8");

    await program.methods
      .signLease(Array.from(tenantSignatureHash.slice(0, 32)))
      .accounts({
        lease: leasePDA,
        signer: tenant.publicKey,
      })
      .signers([tenant])
      .rpc();

    const leaseAccount = await program.account.lease.fetch(leasePDA);
    
    assert.isTrue(leaseAccount.managerSigned);
    assert.isTrue(leaseAccount.tenantSigned);
    
    // Lease should now be active (both signatures)
    assert.deepEqual(leaseAccount.status, { active: {} });
    assert.isAbove(leaseAccount.activatedAt.toNumber(), 0);

    console.log("✅ Tenant signed lease");
    console.log("🎉 Lease activated!");
  });

  it("Verifies lease signatures", async () => {
    const isValid = await program.methods
      .verifyLease()
      .accounts({
        lease: leasePDA,
      })
      .view();

    assert.isTrue(isValid);
    console.log("✅ Lease verified on-chain");
  });

  it("Completes the lease", async () => {
    // Fast forward time (in real scenario, would wait for end_date)
    // For testing, we'll just test the state transition logic

    await program.methods
      .updateLeaseStatus({ completed: {} })
      .accounts({
        lease: leasePDA,
        signer: manager.publicKey,
      })
      .signers([manager])
      .rpc();

    const leaseAccount = await program.account.lease.fetch(leasePDA);
    assert.deepEqual(leaseAccount.status, { completed: {} });

    console.log("✅ Lease completed");
  });

  it("Fails when unauthorized signer tries to sign", async () => {
    const unauthorizedSigner = Keypair.generate();
    const newLeaseId = "test-lease-unauthorized-" + Date.now();
    
    const [newLeasePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("lease"), Buffer.from(newLeaseId)],
      program.programId
    );

    // Initialize new lease
    await program.methods
      .initializeLease(
        newLeaseId,
        Array.from(leaseHash),
        tenant.publicKey,
        monthlyRent,
        securityDeposit,
        startDate,
        endDate
      )
      .accounts({
        lease: newLeasePDA,
        manager: manager.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([manager])
      .rpc();

    // Airdrop to unauthorized signer
    const airdrop = await provider.connection.requestAirdrop(
      unauthorizedSigner.publicKey,
      anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdrop);

    // Try to sign with unauthorized signer
    try {
      await program.methods
        .signLease(Array.from(Buffer.alloc(32)))
        .accounts({
          lease: newLeasePDA,
          signer: unauthorizedSigner.publicKey,
        })
        .signers([unauthorizedSigner])
        .rpc();
      
      assert.fail("Should have failed with unauthorized signer");
    } catch (err: any) {
      assert.include(err.toString(), "UnauthorizedSigner");
      console.log("✅ Unauthorized signer correctly rejected");
    }
  });

  it("Fails when trying to double-sign", async () => {
    const doubleSignLeaseId = "test-lease-double-" + Date.now();
    
    const [doubleSignPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("lease"), Buffer.from(doubleSignLeaseId)],
      program.programId
    );

    // Initialize lease
    await program.methods
      .initializeLease(
        doubleSignLeaseId,
        Array.from(leaseHash),
        tenant.publicKey,
        monthlyRent,
        securityDeposit,
        startDate,
        endDate
      )
      .accounts({
        lease: doubleSignPDA,
        manager: manager.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([manager])
      .rpc();

    // Sign once
    await program.methods
      .signLease(Array.from(Buffer.alloc(32)))
      .accounts({
        lease: doubleSignPDA,
        signer: manager.publicKey,
      })
      .signers([manager])
      .rpc();

    // Try to sign again
    try {
      await program.methods
        .signLease(Array.from(Buffer.alloc(32)))
        .accounts({
          lease: doubleSignPDA,
          signer: manager.publicKey,
        })
        .signers([manager])
        .rpc();
      
      assert.fail("Should have failed with already signed");
    } catch (err: any) {
      assert.include(err.toString(), "AlreadySigned");
      console.log("✅ Double signing correctly prevented");
    }
  });
});
