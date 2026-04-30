import { CommandMetadata } from "./types"

const rawRegistry: CommandMetadata[] = [
  // Client
  { name: "CLEAR", syntax: "CLEAR", summary: "Clear the console screen", isDangerous: false, category: "Client" },
  { name: "HELP", syntax: "HELP", summary: "Show help information", isDangerous: false, category: "Client" },
  { name: "HISTORY", syntax: "HISTORY", summary: "Show command history", isDangerous: false, category: "Client" },

  // Generic
  { name: "DEL", syntax: "DEL key [key ...]", summary: "Delete a key", isDangerous: false, category: "Generic", docLink: "https://redis.io/commands/del" },
  { name: "EXISTS", syntax: "EXISTS key [key ...]", summary: "Determine if a key exists", isDangerous: false, category: "Generic", docLink: "https://redis.io/commands/exists" },
  { name: "EXPIRE", syntax: "EXPIRE key seconds", summary: "Set a key's time to live in seconds", isDangerous: false, category: "Generic", docLink: "https://redis.io/commands/expire" },
  { name: "KEYS", syntax: "KEYS pattern", summary: "Find all keys matching the given pattern", isDangerous: false, category: "Generic", docLink: "https://redis.io/commands/keys" },
  { name: "SCAN", syntax: "SCAN cursor [MATCH pattern] [COUNT count]", summary: "Incrementally iterate the keys space", isDangerous: false, category: "Generic", docLink: "https://redis.io/commands/scan" },
  { name: "TYPE", syntax: "TYPE key", summary: "Determine the type stored at key", isDangerous: false, category: "Generic", docLink: "https://redis.io/commands/type" },

  // String
  { name: "GET", syntax: "GET key", summary: "Get the value of a key", isDangerous: false, category: "String", docLink: "https://redis.io/commands/get" },
  { name: "SET", syntax: "SET key value [EX seconds|PX milliseconds] [NX|XX]", summary: "Set the string value of a key", isDangerous: false, category: "String", docLink: "https://redis.io/commands/set" },
  { name: "MGET", syntax: "MGET key [key ...]", summary: "Get the values of all the given keys", isDangerous: false, category: "String", docLink: "https://redis.io/commands/mget" },
  { name: "MSET", syntax: "MSET key value [key value ...]", summary: "Set multiple keys to multiple values", isDangerous: false, category: "String", docLink: "https://redis.io/commands/mset" },

  // Hash
  { name: "HDEL", syntax: "HDEL key field [field ...]", summary: "Delete one or more hash fields", isDangerous: false, category: "Hash", docLink: "https://redis.io/commands/hdel" },
  { name: "HEXISTS", syntax: "HEXISTS key field", summary: "Determine if a hash field exists", isDangerous: false, category: "Hash", docLink: "https://redis.io/commands/hexists" },
  { name: "HGET", syntax: "HGET key field", summary: "Get the value of a hash field", isDangerous: false, category: "Hash", docLink: "https://redis.io/commands/hget" },
  { name: "HGETALL", syntax: "HGETALL key", summary: "Get all the fields and values in a hash", isDangerous: false, category: "Hash", docLink: "https://redis.io/commands/hgetall" },
  { name: "HSET", syntax: "HSET key field value [field value ...]", summary: "Set the string value of a hash field", isDangerous: false, category: "Hash", docLink: "https://redis.io/commands/hset" },

  // List
  { name: "LPOP", syntax: "LPOP key", summary: "Remove and get the first element in a list", isDangerous: false, category: "List", docLink: "https://redis.io/commands/lpop" },
  { name: "LPUSH", syntax: "LPUSH key value [value ...]", summary: "Prepend one or multiple values to a list", isDangerous: false, category: "List", docLink: "https://redis.io/commands/lpush" },
  { name: "LRANGE", syntax: "LRANGE key start stop", summary: "Get a range of elements from a list", isDangerous: false, category: "List", docLink: "https://redis.io/commands/lrange" },
  { name: "RPOP", syntax: "RPOP key", summary: "Remove and get the last element in a list", isDangerous: false, category: "List", docLink: "https://redis.io/commands/rpop" },
  { name: "RPUSH", syntax: "RPUSH key value [value ...]", summary: "Append one or multiple values to a list", isDangerous: false, category: "List", docLink: "https://redis.io/commands/rpush" },
  { name: "LLEN", syntax: "LLEN key", summary: "Get the length of a list", isDangerous: false, category: "List", docLink: "https://redis.io/commands/llen" },

  // Set
  { name: "SADD", syntax: "SADD key member [member ...]", summary: "Add one or more members to a set", isDangerous: false, category: "Set", docLink: "https://redis.io/commands/sadd" },
  { name: "SMEMBERS", syntax: "SMEMBERS key", summary: "Get all the members in a set", isDangerous: false, category: "Set", docLink: "https://redis.io/commands/smembers" },
  { name: "SREM", syntax: "SREM key member [member ...]", summary: "Remove one or more members from a set", isDangerous: false, category: "Set", docLink: "https://redis.io/commands/srem" },
  { name: "SCARD", syntax: "SCARD key", summary: "Get the number of members in a set", isDangerous: false, category: "Set", docLink: "https://redis.io/commands/scard" },

  // Sorted Set
  { name: "ZADD", syntax: "ZADD key score member [score member ...]", summary: "Add one or more members to a sorted set, or update its score if it already exists", isDangerous: false, category: "SortedSet", docLink: "https://redis.io/commands/zadd" },
  { name: "ZRANGE", syntax: "ZRANGE key min max [BYSCORE|BYLEX] [REV] [LIMIT offset count] [WITHSCORES]", summary: "Return a range of members in a sorted set", isDangerous: false, category: "SortedSet", docLink: "https://redis.io/commands/zrange" },
  { name: "ZREM", syntax: "ZREM key member [member ...]", summary: "Remove one or more members from a sorted set", isDangerous: false, category: "SortedSet", docLink: "https://redis.io/commands/zrem" },
  { name: "ZCARD", syntax: "ZCARD key", summary: "Get the number of members in a sorted set", isDangerous: false, category: "SortedSet", docLink: "https://redis.io/commands/zcard" },

  // Server & Connection
  { name: "PING", syntax: "PING [message]", summary: "Ping the server", isDangerous: false, category: "Connection", docLink: "https://redis.io/commands/ping" },
  { name: "INFO", syntax: "INFO [section]", summary: "Get information and statistics about the server", isDangerous: false, category: "Server", docLink: "https://redis.io/commands/info" },
  { name: "FLUSHALL", syntax: "FLUSHALL [ASYNC|SYNC]", summary: "Remove all keys from all databases", isDangerous: true, category: "Server", docLink: "https://redis.io/commands/flushall" },
  { name: "FLUSHDB", syntax: "FLUSHDB [ASYNC|SYNC]", summary: "Remove all keys from the current database", isDangerous: true, category: "Server", docLink: "https://redis.io/commands/flushdb" },
  { name: "CONFIG", syntax: "CONFIG GET|SET parameter [value]", summary: "Get or Set configuration parameters", isDangerous: true, category: "Server", docLink: "https://redis.io/commands/config" },
  { name: "SHUTDOWN", syntax: "SHUTDOWN [NOSAVE|SAVE]", summary: "Synchronously save the dataset to disk and then shut down the server", isDangerous: true, category: "Server", docLink: "https://redis.io/commands/shutdown" },
  { name: "SCRIPT", syntax: "SCRIPT LOAD|FLUSH|KILL|EXISTS ...", summary: "Lua script management", isDangerous: true, category: "Server", docLink: "https://redis.io/commands/script" },
]

export const CommandRegistry: Record<string, CommandMetadata> = {}

rawRegistry.forEach(cmd => {
  CommandRegistry[cmd.name.toUpperCase()] = cmd
})

export function getCommandMetadata(commandName: string): CommandMetadata | undefined {
  return CommandRegistry[commandName.toUpperCase()]
}
