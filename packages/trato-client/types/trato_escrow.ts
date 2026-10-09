/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/trato_escrow.json`.
 */
export type TratoEscrow = {
  "address": "973yrLGt8Jro3ak66GxTyBXBYens5di54txDxJFGJNxG",
  "metadata": {
    "name": "tratoEscrow",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Escrow on-chain para os milestones do Trato"
  },
  "instructions": [
    {
      "name": "fund",
      "discriminator": [
        218,
        188,
        111,
        221,
        152,
        113,
        174,
        7
      ],
      "accounts": [
        {
          "name": "client",
          "writable": true,
          "signer": true
        },
        {
          "name": "freelancer"
        },
        {
          "name": "mint"
        },
        {
          "name": "clientTokenAccount",
          "writable": true
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "client"
              },
              {
                "kind": "arg",
                "path": "milestoneId"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "escrow"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "milestoneId",
          "type": {
            "array": [
              "u8",
              16
            ]
          }
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "markSubmitted",
      "discriminator": [
        18,
        250,
        191,
        238,
        240,
        50,
        213,
        237
      ],
      "accounts": [
        {
          "name": "freelancer",
          "signer": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "escrow.client",
                "account": "escrow"
              },
              {
                "kind": "account",
                "path": "escrow.milestone_id",
                "account": "escrow"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "refund",
      "discriminator": [
        2,
        96,
        183,
        251,
        63,
        208,
        46,
        46
      ],
      "accounts": [
        {
          "name": "client",
          "writable": true,
          "signer": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "mint"
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "escrow.client",
                "account": "escrow"
              },
              {
                "kind": "account",
                "path": "escrow.milestone_id",
                "account": "escrow"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "escrow"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "clientTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram"
        }
      ],
      "args": []
    },
    {
      "name": "release",
      "discriminator": [
        253,
        249,
        15,
        206,
        28,
        127,
        193,
        241
      ],
      "accounts": [
        {
          "name": "client",
          "writable": true,
          "signer": true,
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "freelancer",
          "relations": [
            "escrow"
          ]
        },
        {
          "name": "mint"
        },
        {
          "name": "escrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "escrow.client",
                "account": "escrow"
              },
              {
                "kind": "account",
                "path": "escrow.milestone_id",
                "account": "escrow"
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "escrow"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "freelancerTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "freelancer"
              },
              {
                "kind": "account",
                "path": "tokenProgram"
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "escrow",
      "discriminator": [
        31,
        213,
        123,
        187,
        186,
        22,
        218,
        155
      ]
    }
  ],
  "events": [
    {
      "name": "escrowFunded",
      "discriminator": [
        228,
        243,
        166,
        74,
        22,
        167,
        157,
        244
      ]
    },
    {
      "name": "escrowRefunded",
      "discriminator": [
        132,
        209,
        49,
        109,
        135,
        138,
        28,
        81
      ]
    },
    {
      "name": "escrowReleased",
      "discriminator": [
        131,
        7,
        138,
        104,
        166,
        190,
        113,
        112
      ]
    },
    {
      "name": "escrowSubmitted",
      "discriminator": [
        115,
        32,
        4,
        171,
        14,
        82,
        213,
        173
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidAmount",
      "msg": "O valor do escrow precisa ser maior que zero"
    },
    {
      "code": 6001,
      "name": "sameParty",
      "msg": "Cliente e freelancer precisam ser wallets diferentes"
    },
    {
      "code": 6002,
      "name": "invalidStatus",
      "msg": "O estado atual do escrow não permite esta ação"
    },
    {
      "code": 6003,
      "name": "invalidMint",
      "msg": "O mint informado não corresponde ao mint do escrow"
    },
    {
      "code": 6004,
      "name": "invalidVaultBalance",
      "msg": "O vault possui saldo menor que o valor acordado"
    },
    {
      "code": 6005,
      "name": "arithmeticOverflow",
      "msg": "Uma operação aritmética excedeu o limite permitido"
    }
  ],
  "types": [
    {
      "name": "escrow",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "client",
            "type": "pubkey"
          },
          {
            "name": "freelancer",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "milestoneId",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "escrowStatus"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "escrowFunded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "client",
            "type": "pubkey"
          },
          {
            "name": "freelancer",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "milestoneId",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "escrowRefunded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "client",
            "type": "pubkey"
          },
          {
            "name": "milestoneId",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "escrowReleased",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "client",
            "type": "pubkey"
          },
          {
            "name": "freelancer",
            "type": "pubkey"
          },
          {
            "name": "milestoneId",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "escrowStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "funded"
          },
          {
            "name": "submitted"
          }
        ]
      }
    },
    {
      "name": "escrowSubmitted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "escrow",
            "type": "pubkey"
          },
          {
            "name": "freelancer",
            "type": "pubkey"
          },
          {
            "name": "milestoneId",
            "type": {
              "array": [
                "u8",
                16
              ]
            }
          }
        ]
      }
    }
  ]
};
