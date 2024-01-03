# Chapter 6: BSV20-V2 
## Introduction:
The **BSV20 - V2** file contains a React component named BSV20v2. 
This component is designed to facilitate the inscription of **BSV20 - V2** using the `BSV20Mint` class from the scrypt-ord library. 
Let's break down the key features of this component.

So, i will take through with step by step explaination and you can also get the complete code at [Github](https://github.com/sCrypt-Inc/inscribe/blob/learn/src/bsv20v2.tsx)

![Inscribe BSV-20 v2](https://github.com/sCrypt-Inc/image-hosting/blob/master/learn-scrypt-courses/course-04/5.png?raw=true)

## `BSV20Mint` Contract


```ts
import { BSV20V2 } from 'scrypt-ord'
import {
    ByteString,
    Addr,
    hash256,
    method,
    prop,
    toByteString,
    assert,
    MethodCallOptions,
    ContractTransaction,
    bsv,
} from 'scrypt-ts'

export class BSV20Mint extends BSV20V2 {
    @prop(true)
    supply: bigint

    @prop()
    lim: bigint

    constructor(
        id: ByteString,
        sym: ByteString,
        max: bigint,
        dec: bigint,
        lim: bigint
    ) {
        super(id, sym, max, dec)
        this.init(...arguments)

        this.supply = max
        this.lim = lim
    }

    @method()
    public mint(dest: Addr, amount: bigint) {
        // Check mint amount doesn't exceed maximum.
        assert(amount <= this.lim, 'mint amount exceeds maximum')
        assert(amount > 0n, 'mint amount should > 0')

        this.supply -= amount
        assert(this.supply >= 0n, 'all supply mint out')
        let outputs = toByteString('')

        if (this.supply > 0n) {
            outputs += this.buildStateOutputFT(this.supply)
        }

        // Build FT P2PKH output to dest paying specified amount of tokens.
        outputs += BSV20V2.buildTransferOutput(dest, this.id, amount)

        // Build change output.
        outputs += this.buildChangeOutput()

        assert(hash256(outputs) === this.ctx.hashOutputs, 'hashOutputs mismatch')
    }

    static async mintTxBuilder(
        current: BSV20Mint,
        options: MethodCallOptions<BSV20Mint>,
        dest: Addr,
        amount: bigint
    ): Promise<ContractTransaction> {
        const defaultAddress = await current.signer.getDefaultAddress()

        const remaining = current.supply - amount

        const tx = new bsv.Transaction().addInput(current.buildContractInput())

        const nexts: any[] = []
        const tokenId = current.getTokenId()
        if (remaining > 0n) {
            const next = current.next()

            if (!next.id) {
                next.id = toByteString(tokenId, true)
            }

            next.supply = remaining
            next.setAmt(remaining)

            tx.addOutput(
                new bsv.Transaction.Output({
                    satoshis: 1,
                    script: next.lockingScript,
                })
            )

            nexts.push({
                instance: next,
                balance: 1,
                atOutputIndex: 0,
            })
        }

        tx.addOutput(
            bsv.Transaction.Output.fromBufferReader(
                new bsv.encoding.BufferReader(
                    Buffer.from(
                        BSV20V2.buildTransferOutput(
                            dest,
                            toByteString(tokenId, true),
                            amount
                        ),
                        'hex'
                    )
                )
            )
        )

        tx.change(options.changeAddress || defaultAddress)
        return { tx, atInputIndex: 0, nexts }
    }
}
```


**Extends `BSV20V2`:** Every BSV20-v2 contract needs to inherit the `BSV20V2` base class.

**Public Function:** The BSV20-v2 protocol issues all tokens upon deployment. Implement any logical token distribution through the public methods of the contract. The `mint` method implements the simplest logic, and anyone can mint the tokens locked in the contract.

## react `BSV20v2` compoment

```ts

import { useState } from "react";
import { Container, Box, Typography, Button, TextField } from '@mui/material';
import { OneSatApis, isBSV20v2 } from "scrypt-ord";
import { Addr, MethodCallOptions, PandaSigner, bsv, fromByteString, toByteString } from "scrypt-ts";
import { Navigate } from "react-router-dom";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import Backdrop from "@mui/material/Backdrop";
import CircularProgress from "@mui/material/CircularProgress";
import { BSV20Mint } from "./contracts/bsv20Mint";

import Avatar  from "@mui/material/Avatar";

import { useAppProvider } from "./AppContext";

import artifact from "../public/bsv20Mint_release_desc.json";


BSV20Mint.loadArtifact(artifact)

function BSV20v2(props) {

    const [_isLoading, setLoading] = useState<boolean>(false);

    const [_symbol, setSymbol] = useState<string | undefined>(undefined)
    const [_max, setMax] = useState<bigint | undefined>(210000000n)
    const [_decimal, setDecimal] = useState<bigint | undefined>(0n)
    const [_lim, setLim] = useState<bigint | undefined>(1000n)
    const [_icon, setIcon] = useState<string | undefined>(undefined)
    const [_tokenId, setTokenId] = useState<string | undefined>(undefined)
    const [_available, setAvailable] = useState<bigint | undefined>(undefined)


    const [_tokenIdStatus, setTokenIdStatus] = useState<'valid' | 'invalid'>(
        'invalid'
    );

    const [_helperText, setHelperText] = useState<undefined | string>(
        undefined
    );

    const symbolOnChange = (e) => { 
        if (e.target.value) {
            setSymbol(e.target.value)
        } else {
            setSymbol(undefined)
        }
    }

    const { ordiAddress: _ordiAddress, 
        network: _network,
        signer: _signer,
        connected} = useAppProvider();

    const maxOnChange = (e) => {
        if (/^\d+$/.test(e.target.value)) {
            setMax(BigInt(e.target.value))
        } else {
            setMax(undefined)
        }
    }

    const tokenIdOnChange = (e) => {
        if (e.target.value) {
            setTokenId(e.target.value)
        } else {
            setTokenId(undefined)
        }
    }

    const limOnChange = (e) => {
        if (/^\d+$/.test(e.target.value)) {
            setLim(BigInt(e.target.value))
        } else {
            setLim(undefined)
        }
    }


    const iconOnChange = (e) => {
        if (isBSV20v2(e.target.value)) {
            setIcon(e.target.value)
        } else {
            setIcon(undefined)
        }
    }


    const clearDeployInfo = (
      ) => {
       
        setSymbol(undefined);
        setMax(undefined);
        setDecimal(undefined);
        setLim(undefined);
        setIcon(undefined);
      };

    const setTokenInfo = (
        sym: string,
        max: bigint,
        dec: bigint,
        lim: bigint,
        available: bigint,
        icon?: string
        ) => {
         
        setSymbol(sym);
        setMax(max / BigInt(Math.pow(10, Number(dec))));
        setDecimal(BigInt(dec));
        setLim(lim);
        setAvailable(available);
        if(icon) {
            setIcon(icon);
        }
        setTokenIdStatus('valid')
    };

    const clearTokenId = (
        ) => {
         
        setTokenId(undefined);
        setTokenIdStatus('invalid')
    };

    const [_mintOrDeploy, setMintOrDeploy] = useState("mint");
    const mintOrDeployOnChange = (e) => {
      const value = e.target.value as string;
      setMintOrDeploy(value);
      if (value === "deploy") {
        clearDeployInfo();
      } else {
        clearTokenId();
      }
      setResult(undefined);
      setHelperText(undefined)
    };

    const mintTokenIdOnBlur = async () => {
      if (_tokenId && isBSV20v2(_tokenId)) {
        try {
          const info = await fetch(
              `${
                _network === bsv.Networks.mainnet
                  ? "https://ordinals.gorillapool.io"
                  : "https://testnet.ordinals.gorillapool.io"
              }/api/inscriptions/${_tokenId}/latest?script=true`
            )
            .then((r) => r.json())
            .catch((e) => {
              console.error("get inscriptions by tokenid failed!");
              return null;
            });

          if (info === null) {
            setHelperText("No token found!")
            clearTokenId()
            return;
          }

          console.log('info', info)

          const { amt, sym, icon } = info.origin?.data?.insc?.json || {};



          const instance = BSV20Mint.fromUTXO({
            txId: info.txid,
            outputIndex: info.vout,
            script: Buffer.from(info.script, "base64").toString("hex"),
            satoshis: info.satoshis,
          });

          setTokenInfo(fromByteString(instance.sym), instance.max, instance.dec, instance.lim, instance.supply, icon);
          setHelperText(undefined)

        } catch (e) {
            setHelperText((e as unknown as any).message || "Unknow error")
            console.error('mintTokenIdOnBlur error:', e)
        }
      } else {
        if(_tokenId && !isBSV20v2(_tokenId)) {
            setHelperText("Invalid Token Id")
        }

        clearTokenId()
      }
    };

    const decimalOnChange = (e) => {
        if (/^\d+$/.test(e.target.value)) {
            setDecimal(BigInt(e.target.value))
        } else {
            setDecimal(undefined)
        }
    }

    const validMintInput = () => {
        return _tokenIdStatus === 'valid' && _tokenId !== undefined && _symbol !== undefined && _max !== undefined && _decimal !== undefined && _lim !== undefined
    }

    const validDeployInput = () => {
        return _symbol !== undefined && _max !== undefined && _decimal !== undefined && _lim !== undefined
    }

    const [_result, setResult] = useState<string | undefined>(undefined)

    const deploy = async () => {
        try {
            setLoading(true)
            const signer = _signer as PandaSigner
            const symbol = toByteString(_symbol!, true)
            const total = _max! * BigInt(Math.pow(10, Number(_decimal!)));
   
            const instance = new BSV20Mint(toByteString(''), symbol, total, _decimal!, _lim!)
            await instance.connect(signer)

            // deploy a new FT
            const tokenId = await instance.deployToken(_icon ? {
                icon: _icon
            } : {})

            setResult(`Token ID: ${tokenId}`)

            setSymbol(undefined)
            setMax(undefined)
            setDecimal(undefined)
            setIcon(undefined)
            setLim(undefined)
        } catch (e: any) {
            console.error('error', e)
            setResult(`${e.message ?? e}`)
        } finally {
            setLoading(false)
        }

    }

    const mint = async () => {
        try {
            setLoading(true)
            const signer = _signer as PandaSigner

            const utxo = await OneSatApis.fetchLatestByOrigin(_tokenId!, _network!);
            if(!utxo) {
                setResult(`No UTXO found for token id!`)
                return;
            }


            const instance = BSV20Mint.fromUTXO(utxo);

            await instance.connect(signer)

            instance.bindTxBuilder('mint', BSV20Mint.mintTxBuilder)

            const {tx} = await instance.methods.mint(
                Addr(_ordiAddress!.toByteString()),
                instance.lim,
                {} as MethodCallOptions<BSV20Mint>
            )

            setResult(`Mint Tx: ${tx.id}`)


        } catch (e: any) {
            console.error('error', e)
            setResult(`${e.message ?? e}`)
        } finally {
            setLoading(false)
        }

    }


    return (
        <Container maxWidth="md">
            {!connected() && (<Navigate to="/" />)}
            <Box sx={{ my: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom align="center">
                    Inscribe BSV-20 v2
                </Typography>
            </Box>

            <Box sx={{ my: 2 }}>
                <FormControl>
                <FormLabel id="radio-buttons-mint-deploy-label" sx={{ mb: 1 }}>
                    Mint or Deploy
                </FormLabel>
                <RadioGroup
                    aria-labelledby="radio-buttons-mint-deploy-label"
                    defaultValue="mint"
                    name="radio-buttons-mint-deploy"
                    onChange={mintOrDeployOnChange}
                >
                    <FormControlLabel
                    value="mint"
                    control={<Radio />}
                    label="Mint Existing Token"
                    />
                    <FormControlLabel
                    value="deploy"
                    control={<Radio />}
                    label="Deploy New Token"
                    />
                </RadioGroup>
                </FormControl>
            </Box>
            {_mintOrDeploy === "deploy" &&(
                <Box sx={{ mt: 3 }}>
                    <TextField label="Symbol" variant="outlined" fullWidth required onChange={symbolOnChange} />

                    <TextField label="Max Supply" 
                    type="number" 
                    variant="outlined"
                    placeholder="21000000"
                    fullWidth 
                    required 
                    sx={{ mt: 2 }} onChange={maxOnChange} />
                    <TextField
                    label="Limit Per Mint"
                    sx={{ mt: 2 }}
                    required
                    variant="outlined"
                    placeholder="1000"
                    fullWidth
                    onChange={limOnChange}
                    />
                    <TextField label="Decimal Precision" type="number" placeholder="0" InputProps={{ inputProps: { min: 0, max: 18 } }} variant="outlined" fullWidth required sx={{ mt: 2 }} onChange={decimalOnChange} />
                    <TextField label="Icon" variant="outlined" placeholder="1Sat Ordinals NFT origin" fullWidth sx={{ mt: 2 }} onChange={iconOnChange} />
                    <Button variant="contained" color="primary" sx={{ mt: 2 }} disabled={!connected() || !validDeployInput()} onClick={deploy}>
                        Deploy It!
                    </Button>
                </Box>
            )}

            {_mintOrDeploy === "mint" && (
                <Box sx={{ mt: 3 }}>
                    <TextField label="TokenId" variant="outlined" placeholder="TokenId" fullWidth
                    required
                    error={typeof _helperText === 'string'}
                    helperText={_helperText}
                    onChange={tokenIdOnChange}
                    onBlur={mintTokenIdOnBlur} />

                    {_tokenIdStatus === 'valid' && (
                            <Box>
                                <Typography variant="body1" sx={{ mt: 2, ml: 2 }}>
                                Symbol: {_symbol?.toString() || "Null"}
                                </Typography>
                                <Typography variant="body1" sx={{ mt: 2, ml: 2 }}>
                                Max Supply: {_max?.toString()}
                                </Typography>
                                <Typography variant="body1" sx={{ mt: 2, ml: 2 }}>
                                Available Supply: {_available?.toString() || "0"}
                                </Typography>
                                <Typography variant="body1" sx={{ mt: 2, ml: 2 }}>
                                Limit Per Mint: {_lim?.toString()}
                                </Typography>
                                <Typography variant="body1" sx={{ mt: 2, ml: 2, mb: 1 }}>
                                Decimal Precision: {_decimal?.toString()}
                                </Typography>
                                {
                                    _icon &&(

                                        <Box sx={{display: 'flex', flexDirection: 'row'}}>
                                            <Box>
                                                <Typography variant="body1" sx={{ mt: 2, ml: 2, mb: 1 }}>
                                                Icon: 
                                                </Typography>
                                            </Box>
                                            <Avatar alt="Icon" sx={{marginTop: 1, marginLeft: 0.6}} src={
                                                `https://ordinals.gorillapool.io/content/${_icon}?fuzzy=false`
                                            } />

                                        </Box>


                                    )
                                }
                            </Box>
                    )}

                </Box>
            )}

            { _mintOrDeploy === "mint" && (
                <Button variant="contained" color="primary" sx={{ mt: 2 }} disabled={!connected() || !validMintInput()} onClick={mint}>
                        Mint It!
                </Button>
            )}

            {
                !_result
                    ? ''
                    : (<Box sx={{ mt: 3 }}><Typography variant="body1">{_result}</Typography></Box>)
            }
                        <Box>
                <Typography sx={{marginTop: 10}} variant="body1" align="center">
                    <a style={{ color: "#FE9C2F" }} href="https://docs.1satordinals.com/bsv20#new-in-v2-tickerless-mode" target="_blank" rel="noreferrer">what's new in v2</a>
                </Typography>
            </Box>
            <Backdrop sx={{ color: "#fff", zIndex: 1000000 }} open={_isLoading}>
                <CircularProgress color="inherit" />
            </Backdrop>
        </Container>
    )
}

export default BSV20v2;

```

**Artifact:** Imports **artifact** from `public/bsv20Mint_release_desc.json` and load it with `BSV20Mint.loadArtifact(artifact)`;

**Deploy:** Defines a function **deploy** to handle the deploying logic. The `deploy` function deploys a BSV20-v2 FT by calling `instance.deployToken()`.

**Minting:** Defines a function **mint** to handle the minting logic. 

1. Get latest contract instance by `fromUTXO` and connect a signer
2. Bind a transaction builder to call the contract by `bindTxBuilder`
3. Call contract public function `mint` to mint token.


**scrypt-ord Libraries:** Imports classes and utility functions related to **BSV20v2**, such as **BSV20V2P2PKH** for token instantiation and isBSV20v2 for checking if a given string is a valid **BSV20v2** token.


**Scrypt Libraries:** Imports functionality for handling addresses, signing transactions, and converting values to byte strings from the **scrypt-ts** library.

**React Router:** Imports **Navigate** from **react-router-dom** for programmatic navigation.

**Function Component:** Declares a functional React component named **BSV20v2** that takes **props** as its parameter.

**State Variables:** Uses the **useState** hook to declare state variables like **_symbol**, **_amount**, **_decimal**, **_icon**, and **_result**.

**Return Statement:** Returns JSX content wrapped in a Material-UI **Container** component.

**State Variables:** Declare state variables using **useState** for **symbol**, **amount**, **decimal**, and **icon**. Initial values are set to undefined.

**Event Handlers:** Define event handlers (**symbolOnChange**, **amountOnChange**, **iconOnChange**, **decimalOnChange**) to update state variables based on user input.

**Valid Input Function:** Defines a function validInput that checks if required input fields are defined, enabling or disabling the **`Mint It!`** button accordingly.