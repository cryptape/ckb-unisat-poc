# Lock

Build contracts:

``` sh
capsule build --release
```

## Deployment

This demo contract is deployed on testnet:

```js
{
    codeHash: '0xd7aac16927b2d572b3803c1f68e49d082d3acc2af2614c9be752ff9cec5dc3ea',
    hashType: 'data1' as HashType,
    cellCep: {
        outPoint: {
            txHash: '0xe842b43df31c92d448fa345d60a6df3e03aaab19ef88921654bf95c673a26872',
            index: '0x0',
        },
        depType: 'code' as DepType,
    }
}
```
