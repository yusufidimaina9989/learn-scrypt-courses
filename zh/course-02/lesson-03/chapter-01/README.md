# 第 1 章：实现战舰合约

实现电路后，我们通过以下命令导出一个 zkSNARK 验证器，如【第六步】（https://blog.csdn.net/freedomhero/article/details/126096767）：

```
zokrates export-verifier-scrypt
```

我们得到一个名为“verifier.scrypt”的库。有了这个验证者库，我们可以用 ZKP 实现战舰合约。我们可以开始在合约中构建实际的游戏逻辑。

战舰游戏由两个玩家组成：你和电脑。战舰合约包含四个属性：

`PubKey you` ：用于检查签名以确认你执行了合约。
`PubKey computer`：用于检查签名以确认计算机执行合约。
`int yourHash` : 你所有船只的位置和方向的哈希承诺
`int computerHash` : 电脑所有船只的位置和方向的哈希承诺

除了以上四个属性外，合约还包含三个状态属性：

`successfulYourHits` : 表示你击中战舰的次数
`successfulComputerHits` : 表示电脑击中战舰的次数
`yourTurn` : 表示轮到你或电脑开火


游戏开始时，您和电脑各自秘密放置船只并计算哈希承诺。合约使用双方的哈希承诺和公钥进行初始化。


该合约包含一个名为 `move()` 的公共函数。在 `move()` 函数中，我们使用 zkSNARK 验证器来检查其他玩家提交的证明。


```
 require(ZKNARK.verify([this.yourTurn ? this.computerHash : this.yourHash, x, y, hit ? 1 : 0], proof));
```

`ZKNARK.verify()` 包含四个输入和一个证明：


1. 您或计算机的哈希承诺。
2. `x`, `y` 表示玩家开火的位置。
3. `hit` 表示对方报告你是否命中。
4. `proof` 是对方为开火是否命中而生成的证明。借助验证者库和对方提供的证明，可以检查对方是否诚实。

如果对方提供了一个诚实的结果，它就会通过检查，否则就会失败。之后，我们检查调用合约的玩家的签名是否有效，并根据战舰是否被击中更新对应玩家击中战舰的次数，即更新状态属性 `successfulYourHits` 和 `successfulComputerHits` . 最后我们更新状态属性 `yourTurn`。如果有人击中船只的次数先达到“17”次，则他赢得比赛，比赛结束。如果没有，则保存最新状态并等待下一步。


综上所述，我们已经实现了战舰合约，包括在合约中验证zkSNARK证明和维护游戏状态。