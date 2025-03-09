import {
  Approval as ApprovalEvent,
  ApprovalForAll as ApprovalForAllEvent,
  BaseURISet as BaseURISetEvent,
  EnforcedOptionSet as EnforcedOptionSetEvent,
  MsgInspectorSet as MsgInspectorSetEvent,
  ONFTReceived as ONFTReceivedEvent,
  ONFTSent as ONFTSentEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  PeerSet as PeerSetEvent,
  PreCrimeSet as PreCrimeSetEvent,
  TokenEvolved as TokenEvolvedEvent,
  Transfer as TransferEvent,
  OmniNadsConsumer
} from "../generated/OmniNadsConsumer/OmniNadsConsumer"
import {
  Approval,
  ApprovalForAll,
  BaseURISet,
  EnforcedOptionSet,
  MsgInspectorSet,
  ONFTReceived,
  ONFTSent,
  OwnershipTransferred,
  PeerSet,
  PreCrimeSet,
  TokenEvolved,
  Transfer,
  Token, 
  Global
} from "../generated/schema"
import { BigInt, Bytes } from "@graphprotocol/graph-ts"

class DecodedTokenInfo {
  realTokenId: BigInt
  tokenState: BigInt

  constructor(realTokenId: BigInt, tokenState: BigInt) {
    this.realTokenId = realTokenId
    this.tokenState = tokenState
  }
}

function decodeTokenInfo(encoded: BigInt): DecodedTokenInfo {
  let state = encoded.mod(BigInt.fromI32(10)) 
  let realId = encoded.div(BigInt.fromI32(10)) 
  return new DecodedTokenInfo(realId, state)
}


function getTokenURI(token: Token): string {
  let global = Global.load("global")
  let baseURI: string;
  if (global && global.baseURI != null) {
    baseURI = global.baseURI!
  } else {
    baseURI = "https://arweave.net/XI2afr4wHl_M78ovIGYzCPvU0O8126DndmZ-L3VjrMY/optimism/"
  }
  let state: string = token.tokenState ? token.tokenState! : "0"
  return baseURI + state + "/omninad.json"
}


export function handleApproval(event: ApprovalEvent): void {
  let entity = new Approval(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.owner = event.params.owner
  entity.approved = event.params.approved
  entity.tokenId = event.params.tokenId

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleApprovalForAll(event: ApprovalForAllEvent): void {
  let entity = new ApprovalForAll(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.owner = event.params.owner
  entity.operator = event.params.operator
  entity.approved = event.params.approved

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleBaseURISet(event: BaseURISetEvent): void {
  let entity = new BaseURISet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.baseURI = event.params.baseURI

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()

  let global = Global.load("global")
  if (!global) {
    global = new Global("global")
    global.tokenIds = []
  }
  global.baseURI = event.params.baseURI
  global.save()
}



export function handleEnforcedOptionSet(event: EnforcedOptionSetEvent): void {
  let entity = new EnforcedOptionSet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity._enforcedOptions = changetype<Bytes[]>(event.params._enforcedOptions)

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleMsgInspectorSet(event: MsgInspectorSetEvent): void {
  let entity = new MsgInspectorSet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.inspector = event.params.inspector

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleONFTReceived(event: ONFTReceivedEvent): void {
  let decoded = decodeTokenInfo(event.params.tokenId)
  let realTokenId = decoded.realTokenId
  let newState = decoded.tokenState
  let idStr = realTokenId.toString()
  let token = Token.load(idStr)
  if (!token) {
    token = new Token(idStr)
    token.tokenId = realTokenId
    token.contract = event.address
  }

  token.owner = event.params.toAddress
  token.tokenState = newState.toString()
  token.tokenURI = getTokenURI(token)

  token.blockNumber = event.block.number
  token.blockTimestamp = event.block.timestamp
  token.transactionHash = event.transaction.hash
  token.save()

  let record = new ONFTReceived(event.transaction.hash.concatI32(event.logIndex.toI32()))
  record.guid = event.params.guid
  record.srcEid = event.params.srcEid
  record.toAddress = event.params.toAddress
  record.tokenId = event.params.tokenId
  record.blockNumber = event.block.number
  record.blockTimestamp = event.block.timestamp
  record.transactionHash = event.transaction.hash
  record.save()
}

export function handleONFTSent(event: ONFTSentEvent): void {
  let decoded = decodeTokenInfo(event.params.tokenId)
  let realTokenId = decoded.realTokenId
  let lastKnownState = decoded.tokenState
  let idStr = realTokenId.toString()
  let token = Token.load(idStr)
  if (!token) {
    token = new Token(idStr)
    token.tokenId = realTokenId 
    token.contract = event.address
  }

  token.owner = Bytes.fromHexString("0x0000000000000000000000000000000000000000")!
  token.tokenState = lastKnownState.toString()
  token.blockNumber = event.block.number
  token.blockTimestamp = event.block.timestamp
  token.transactionHash = event.transaction.hash
  token.save()

  let entity = new ONFTSent(event.transaction.hash.concatI32(event.logIndex.toI32()))
  entity.guid = event.params.guid
  entity.dstEid = event.params.dstEid
  entity.fromAddress = event.params.fromAddress
  entity.tokenId = event.params.tokenId
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePeerSet(event: PeerSetEvent): void {
  let entity = new PeerSet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.eid = event.params.eid
  entity.peer = event.params.peer

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePreCrimeSet(event: PreCrimeSetEvent): void {
  let entity = new PreCrimeSet(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.preCrimeAddress = event.params.preCrimeAddress

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleTokenEvolved(event: TokenEvolvedEvent): void {
  let entity = new TokenEvolved(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.tokenId = event.params.tokenId
  entity.evolution = event.params.evolution

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()

  let tokenIdStr = event.params.tokenId.toString()
  let token = Token.load(tokenIdStr)
  if (token) {
    let contract = OmniNadsConsumer.bind(event.address)
    let tokenStateCall = contract.try_tokenState(event.params.tokenId)
    if (!tokenStateCall.reverted) {
      token.tokenState = tokenStateCall.value.toString()
    }
    token.tokenURI = getTokenURI(token)

    token.blockNumber = event.block.number
    token.blockTimestamp = event.block.timestamp
    token.transactionHash = event.transaction.hash
    token.save()
  }
}

export function handleTransfer(event: TransferEvent): void {
  let entity = new Transfer(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.from = event.params.from
  entity.to = event.params.to
  entity.tokenId = event.params.tokenId
  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash
  entity.save()

  let idStr = event.params.tokenId.toString()
  let token = Token.load(idStr)
  if (!token) {
    token = new Token(idStr)
    token.tokenId = event.params.tokenId
    token.contract = event.address
  }

  token.owner = event.params.to

  let contract = OmniNadsConsumer.bind(event.address)
  let stateCall = contract.try_tokenState(event.params.tokenId)
  if (!stateCall.reverted) {
    token.tokenState = stateCall.value.toString()
  } else {
    token.tokenState = "0"
  }

  token.tokenURI = getTokenURI(token)
  token.blockNumber = event.block.number
  token.blockTimestamp = event.block.timestamp
  token.transactionHash = event.transaction.hash
  token.save()
}