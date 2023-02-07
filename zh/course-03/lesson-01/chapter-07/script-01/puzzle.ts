
import { prop, SmartContract, PubKey, FixedArray, assert, Sig} from "scrypt-ts";

export class TicTacToe extends SmartContract {
    @prop()
    alice: PubKey;
    @prop()
    bob: PubKey;

    @prop(true)
    is_alice_turn: boolean;

    @prop(true)
    board: FixedArray<bigint, 9>;

    @prop()
    static readonly EMPTY: bigint = 0n;
    @prop()
    static readonly ALICE: bigint = 1n;
    @prop()
    static readonly BOB: bigint = 2n;

    constructor(alice: PubKey, bob: PubKey, is_alice_turn:boolean, board: FixedArray<bigint, 9>) {
        super(...arguments);
        this.alice = alice;
        this.bob = bob;
        this.is_alice_turn = is_alice_turn;
        this.board = board;
    }

    @method()
    public move(n: bigint, sig: Sig, amount: bigint): void {
        // check position `n`
        assert(n >= 0n && n < 9n);
        // check signature `sig`
        let player: PubKey = this.is_alice_turn ? this.alice : this.bob;
        // TODO: add Check signature

    }

    @method()
    won(play: bigint) : boolean {
        return true;
    }

    @method()
    full() : boolean {
        return true;
    }

}