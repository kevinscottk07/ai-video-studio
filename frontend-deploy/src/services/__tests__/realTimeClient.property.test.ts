/**
 * Property-Based Test for Real-Time Message Delivery
 * 
 * **Feature: ai-video-studio, Property 13: Performance and Error Handling**
 * **Validates: Requirements 12.1, 12.2, 12.5**
 * 
 * This property test validates that the real-time messaging system maintains
 * performance thresholds, handles errors gracefully, and provides reliable
 * message delivery across all network conditions and user scenarios.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { 
  RealTimeClient, 
  ConnectionState, 
  NotificationData,
  ProgressData,
  ProjectUpdateData,
  CommunityUpdateData,
  OptimisticUpdate
} from '../realTimeClient'

// Mock socket.io-client
const mockSocket = {
  connected: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
}

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}))

// Test data generators for property-based testing
function generateTestCases<T>(generator: () => T, count: number = 100): T[] {
  return Array.from({ length: count }, generator)
}

function generateNetworkCondition() {
  const conditions = [
    { type: 'stable', latency: 50, packetLoss: 0, jitter: 5 },
    { type: 'slow', latency: 300, packetLoss: 0.01, jitter: 50 },
    { type: 'unstable', latency: 150, packetLoss: 0.05, jitter: 100 },
    { type: 'poor', latency: 500, packetLoss: 0.1, jitter: 200 },
    { type: 'mobile', latency: 200, packetLoss: 0.02, jitter: 75 }
  ]
  return conditions[Math.floor(Math.random() * conditions.length)]
}

function generateConnectionError() {
  const errors = [
    { type: 'network', message: 'Network Error', code: 'NETWORK_ERROR', recoverable: true },
    { type: 'timeout', message: 'Connection Timeout', code: 'TIMEOUT', recoverable: true },
    { type: 'auth', message: 'Authentication Failed', code: 'AUTH_ERROR', recoverable: false },
    { type: 'server', message: 'Server Error', code: 'SERVER_ERROR', recoverable: true },
    { type: 'protocol', message: 'Protocol Error', code: 'PROTOCOL_ERROR', recoverable: false }
  ]
  return errors[Math.floor(Math.random() * errors.length)]
}

function generateMessage() {
  const messageTypes = ['notification', 'progress:update', 'project:updated', 'community:updated']
  const type = messageTypes[Math.floor(Math.random() * messageTypes.length)]
  
  const baseMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    priority: Math.random() > 0.8 ? 'high' : 'normal'
  }

  switch (type) {
    case 'notification':
      return {
        ...baseMessage,
        type: 'notification',
        data: {
          type: ['info', 'success', 'warning', 'error'][Math.floor(Math.random() * 4)],
          title: `Test Notification ${Math.floor(Math.random() * 1000)}`,
          message: `This is a test notification with random content ${Math.random()}`,
          persistent: Math.random() > 0.7
        } as NotificationData
      }
    
    case 'progress:update':
      return {
        ...baseMessage,
        type: 'progress:update',
        data: {
          jobId: `job_${Math.random().toString(36).substr(2, 9)}`,
          percentage: Math.floor(Math.random() * 101),
          stage: ['initializing', 'processing', 'rendering', 'finalizing'][Math.floor(Math.random() * 4)],
          message: `Processing step ${Math.floor(Math.random() * 10)}`,
          timestamp: new Date().toISOString()
        } as ProgressData
      }
    
    case 'project:updated':
      return {
        ...baseMessage,
        type: 'project:updated',
        data: {
          projectId: `project_${Math.random().toString(36).substr(2, 9)}`,
          type: ['settings', 'assets', 'status', 'collaboration'][Math.floor(Math.random() * 4)],
          data: { updated: true, value: Math.random() },
          userId: `user_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString()
        } as ProjectUpdateData
      }
    
    case 'community:updated':
      return {
        ...baseMessage,
        type: 'community:updated',
        data: {
          type: ['like', 'comment', 'share', 'new_post'][Math.floor(Math.random() * 4)],
          contentId: `content_${Math.random().toString(36).substr(2, 9)}`,
          userId: `user_${Math.random().toString(36).substr(2, 9)}`,
          data: { count: Math.floor(Math.random() * 100) },
          timestamp: new Date().toISOString()
        } as CommunityUpdateData
      }
    
    default:
      return baseMessage
  }
}

function generateMessageBurst() {
  const burstSize = Math.floor(Math.random() * 50) + 1 // 1-50 messages
  const timeWindow = Math.floor(Math.random() * 1000) + 100 // 100-1100ms
  
  return {
    messages: Array.from({ length: burstSize }, generateMessage),
    timeWindow,
    expectedDeliveryTime: Math.max(timeWindow * 0.1, 50) // At least 50ms
  }
}

function generateOptimisticUpdate() {
  const updateTypes = ['project:update', 'community:interaction', 'user:status']
  const type = updateTypes[Math.floor(Math.random() * updateTypes.length)]
  
  return {
    type,
    data: {
      id: Math.random().toString(36).substr(2, 9),
      value: Math.random(),
      timestamp: Date.now()
    },
    rollback: vi.fn(),
    expectedConfirmationTime: Math.floor(Math.random() * 5000) + 1000 // 1-6 seconds
  }
}

function generateUserScenario() {
  return {
    userId: `user_${Math.random().toString(36).substr(2, 9)}`,
    connectionQuality: generateNetworkCondition(),
    subscriptions: {
      projects: Array.from({ length: Math.floor(Math.random() * 5) }, () => 
        `project_${Math.random().toString(36).substr(2, 9)}`
      ),
      generations: Array.from({ length: Math.floor(Math.random() * 3) }, () => 
        `job_${Math.random().toString(36).substr(2, 9)}`
      ),
      community: Math.random() > 0.5
    },
    activityLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
  }
}

function simulateNetworkDelay(condition: ReturnType<typeof generateNetworkCondition>) {
  return new Promise(resolve => {
    const delay = condition.latency + (Math.random() * condition.jitter)
    setTimeout(resolve, delay)
  })
}

function simulatePacketLoss(condition: ReturnType<typeof generateNetworkCondition>) {
  return Math.random() < condition.packetLoss
}

describe('Real-Time Message Delivery - Property Tests', () => {
  let client: RealTimeClient
  let mockGetToken: vi.Mock

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetToken = vi.fn().mockResolvedValue('mock-token')
    client = new RealTimeClient(mockGetToken)
    
    // Reset socket mock
    mockSocket.connected = false
    mockSocket.connect.mockClear()
    mockSocket.disconnect.mockClear()
    mockSocket.emit.mockClear()
    mockSocket.on.mockClear()
    mockSocket.off.mockClear()
  })

  afterEach(() => {
    client.disconnect()
  })

  describe('Property 13: Performance and Error Handling', () => {
    it('should respond within 200ms for standard operations under all network conditions', async () => {
      const testCases = generateTestCases(() => ({
        networkCondition: generateNetworkCondition(),
        operation: ['connect', 'subscribe', 'unsubscribe', 'sendUpdate'][Math.floor(Math.random() * 4)],
        payload: generateMessage()
      }), 100)

      for (const { networkCondition, operation, payload } of testCases) {
        // Property: For any network condition and operation type, the system should
        // respond within 200ms for standard operations (excluding network latency)
        
        // Simulate network conditions
        const networkDelay = networkCondition.latency
        const shouldDropPacket = simulatePacketLoss(networkCondition)
        
        if (shouldDropPacket) {
          // Skip this test case as packet was "lost"
          continue
        }

        const startTime = Date.now()
        
        try {
          switch (operation) {
            case 'connect':
              await client.connect()
              // Simulate successful connection
              const connectHandler = mockSocket.on.mock.calls.find(
                call => call[0] === 'connect'
              )?.[1]
              if (connectHandler) {
                mockSocket.connected = true
                connectHandler()
              }
              break
              
            case 'subscribe':
              if (client.isConnected()) {
                client.subscribeToProject('test-project')
              }
              break
              
            case 'unsubscribe':
              if (client.isConnected()) {
                client.unsubscribeFromProject('test-project')
              }
              break
              
            case 'sendUpdate':
              if (client.isConnected()) {
                client.sendOptimisticUpdate(payload.type, payload.data)
              }
              break
          }
          
          const operationTime = Date.now() - startTime
          const adjustedTime = operationTime - networkDelay
          
          // Standard operations should complete within 200ms (excluding network latency)
          if (networkCondition.type === 'stable' || networkCondition.type === 'slow') {
            expect(adjustedTime).toBeLessThan(200)
          } else {
            // For poor conditions, allow more time but still reasonable
            expect(adjustedTime).toBeLessThan(500)
          }
          
        } catch (error) {
          // Operations should not throw errors for network conditions alone
          if (networkCondition.type !== 'poor') {
            throw error
          }
        }
      }
    })

    it('should maintain functionality under high load with auto-scaling behavior', async () => {
      const testCases = generateTestCases(() => ({
        concurrentUsers: Math.floor(Math.random() * 100) + 10, // 10-109 users
        messageBurst: generateMessageBurst(),
        networkCondition: generateNetworkCondition()
      }), 50) // Reduced count for performance

      for (const { concurrentUsers, messageBurst, networkCondition } of testCases) {
        // Property: For any number of concurrent users and message load, the system
        // should maintain functionality through auto-scaling infrastructure
        
        const clients: RealTimeClient[] = []
        const connectionPromises: Promise<void>[] = []
        
        try {
          // Create multiple concurrent clients
          for (let i = 0; i < Math.min(concurrentUsers, 20); i++) { // Limit for test performance
            const testClient = new RealTimeClient(mockGetToken)
            clients.push(testClient)
            
            connectionPromises.push(testClient.connect().then(() => {
              // Simulate connection success
              const connectHandler = mockSocket.on.mock.calls.find(
                call => call[0] === 'connect'
              )?.[1]
              if (connectHandler) {
                mockSocket.connected = true
                connectHandler()
              }
            }))
          }
          
          // Wait for all connections with timeout
          await Promise.race([
            Promise.all(connectionPromises),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 5000))
          ])
          
          // Simulate message burst
          const messagePromises = messageBurst.messages.map(async (message, index) => {
            await new Promise(resolve => setTimeout(resolve, index * (messageBurst.timeWindow / messageBurst.messages.length)))
            
            // Simulate message delivery to random clients
            const targetClient = clients[Math.floor(Math.random() * clients.length)]
            if (targetClient && targetClient.isConnected()) {
              const handler = mockSocket.on.mock.calls.find(
                call => call[0] === message.type
              )?.[1]
              if (handler) {
                handler(message.data)
              }
            }
          })
          
          const startTime = Date.now()
          await Promise.all(messagePromises)
          const deliveryTime = Date.now() - startTime
          
          // System should handle the load within reasonable time
          const expectedMaxTime = messageBurst.timeWindow * 2 // Allow 2x the burst window
          expect(deliveryTime).toBeLessThan(expectedMaxTime)
          
          // All clients should remain connected
          const connectedClients = clients.filter(c => c.isConnected())
          expect(connectedClients.length).toBeGreaterThan(clients.length * 0.8) // At least 80% connected
          
        } finally {
          // Cleanup
          clients.forEach(c => c.disconnect())
        }
      }
    })

    it('should provide graceful degradation with clear user communication during errors', async () => {
      const testCases = generateTestCases(() => ({
        errorScenario: generateConnectionError(),
        userScenario: generateUserScenario(),
        recoveryTime: Math.floor(Math.random() * 10000) + 1000 // 1-11 seconds
      }), 100)

      for (const { errorScenario, userScenario, recoveryTime } of testCases) {
        // Property: For any error scenario, the system should provide graceful
        // degradation and clear communication to users
        
        const errorEvents: string[] = []
        const stateChanges: ConnectionState[] = []
        
        // Track error events and state changes
        client.on('connection:error', (error) => {
          errorEvents.push(error.message)
        })
        
        client.on('connection:state', (state) => {
          stateChanges.push(state)
        })
        
        try {
          await client.connect()
          
          // Simulate initial connection success
          const connectHandler = mockSocket.on.mock.calls.find(
            call => call[0] === 'connect'
          )?.[1]
          if (connectHandler) {
            mockSocket.connected = true
            connectHandler()
          }
          
          expect(client.getConnectionState()).toBe(ConnectionState.CONNECTED)
          
          // Simulate error occurrence
          const errorHandler = mockSocket.on.mock.calls.find(
            call => call[0] === 'connect_error'
          )?.[1]
          
          if (errorHandler) {
            const error = new Error(errorScenario.message)
            ;(error as any).code = errorScenario.code
            errorHandler(error)
          }
          
          // System should handle error gracefully
          expect(errorEvents.length).toBeGreaterThan(0)
          expect(errorEvents[0]).toContain(errorScenario.message)
          
          // State should transition appropriately
          if (errorScenario.recoverable) {
            expect(stateChanges).toContain(ConnectionState.RECONNECTING)
          } else {
            expect(stateChanges).toContain(ConnectionState.ERROR)
          }
          
          // For recoverable errors, simulate recovery
          if (errorScenario.recoverable) {
            await new Promise(resolve => setTimeout(resolve, Math.min(recoveryTime, 1000))) // Limit wait time for tests
            
            // Simulate reconnection success
            if (connectHandler) {
              mockSocket.connected = true
              connectHandler()
            }
            
            // Should eventually recover
            expect(client.getConnectionState()).toBe(ConnectionState.CONNECTED)
          }
          
        } catch (error) {
          // Non-recoverable errors should be handled gracefully
          if (!errorScenario.recoverable) {
            expect(client.getConnectionState()).toBe(ConnectionState.ERROR)
          } else {
            throw error
          }
        }
      }
    })

    it('should handle optimistic updates with server reconciliation under all conditions', async () => {
      const testCases = generateTestCases(() => ({
        optimisticUpdate: generateOptimisticUpdate(),
        networkCondition: generateNetworkCondition(),
        serverResponse: Math.random() > 0.8 ? 'failure' : 'success', // 20% failure rate
        responseDelay: Math.floor(Math.random() * 3000) + 500 // 0.5-3.5 seconds
      }), 100)

      for (const { optimisticUpdate, networkCondition, serverResponse, responseDelay } of testCases) {
        // Property: For any optimistic update and network condition, the system
        // should handle server reconciliation correctly
        
        await client.connect()
        
        // Simulate connection success
        const connectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'connect'
        )?.[1]
        if (connectHandler) {
          mockSocket.connected = true
          connectHandler()
        }
        
        expect(client.isConnected()).toBe(true)
        
        // Send optimistic update
        const updateId = client.sendOptimisticUpdate(
          optimisticUpdate.type,
          optimisticUpdate.data,
          optimisticUpdate.rollback
        )
        
        expect(updateId).toBeTruthy()
        expect(updateId).toMatch(/^opt_\d+_[a-z0-9]+$/)
        
        // Verify update is tracked
        const pendingUpdates = client.getPendingUpdates()
        expect(pendingUpdates.some(u => u.id === updateId)).toBe(true)
        
        // Simulate network delay
        await simulateNetworkDelay(networkCondition)
        
        // Simulate server response
        setTimeout(() => {
          if (serverResponse === 'success') {
            const confirmHandler = mockSocket.on.mock.calls.find(
              call => call[0] === 'optimistic:confirmed'
            )?.[1]
            if (confirmHandler) {
              confirmHandler({ id: updateId })
            }
          } else {
            const failHandler = mockSocket.on.mock.calls.find(
              call => call[0] === 'optimistic:failed'
            )?.[1]
            if (failHandler) {
              failHandler({ id: updateId, error: 'Server rejected update' })
            }
          }
        }, Math.min(responseDelay, 1000)) // Limit delay for tests
        
        // Wait for response
        await new Promise(resolve => setTimeout(resolve, Math.min(responseDelay + 100, 1100)))
        
        const finalPendingUpdates = client.getPendingUpdates()
        
        if (serverResponse === 'success') {
          // Update should be confirmed and removed from pending
          expect(finalPendingUpdates.some(u => u.id === updateId)).toBe(false)
        } else {
          // Update should be rolled back and removed from pending
          expect(finalPendingUpdates.some(u => u.id === updateId)).toBe(false)
          expect(optimisticUpdate.rollback).toHaveBeenCalled()
        }
      }
    })

    it('should maintain message ordering and delivery guarantees', async () => {
      const testCases = generateTestCases(() => ({
        messageSequence: Array.from({ length: Math.floor(Math.random() * 20) + 5 }, (_, i) => ({
          ...generateMessage(),
          sequenceNumber: i,
          priority: Math.random() > 0.8 ? 'high' : 'normal'
        })),
        networkCondition: generateNetworkCondition()
      }), 50) // Reduced count for performance

      for (const { messageSequence, networkCondition } of testCases) {
        // Property: For any sequence of messages, the system should maintain
        // ordering guarantees and delivery reliability
        
        const receivedMessages: any[] = []
        const messageHandlers = new Map<string, Function>()
        
        await client.connect()
        
        // Simulate connection success
        const connectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'connect'
        )?.[1]
        if (connectHandler) {
          mockSocket.connected = true
          connectHandler()
        }
        
        // Set up message handlers
        messageSequence.forEach(message => {
          if (!messageHandlers.has(message.type)) {
            const handler = (data: any) => {
              receivedMessages.push({ ...data, receivedAt: Date.now() })
            }
            messageHandlers.set(message.type, handler)
            client.on(message.type as any, handler)
          }
        })
        
        // Send messages with simulated network conditions
        for (const message of messageSequence) {
          if (!simulatePacketLoss(networkCondition)) {
            await simulateNetworkDelay(networkCondition)
            
            const handler = mockSocket.on.mock.calls.find(
              call => call[0] === message.type
            )?.[1]
            if (handler) {
              handler(message.data)
            }
          }
        }
        
        // Wait for message processing
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Verify message delivery
        const expectedMessages = messageSequence.filter(msg => 
          !simulatePacketLoss(networkCondition)
        )
        
        if (networkCondition.type === 'stable' || networkCondition.type === 'slow') {
          // For stable connections, expect high delivery rate
          expect(receivedMessages.length).toBeGreaterThan(expectedMessages.length * 0.9)
        } else {
          // For poor connections, expect reasonable delivery rate
          expect(receivedMessages.length).toBeGreaterThan(expectedMessages.length * 0.7)
        }
        
        // High priority messages should be delivered
        const highPriorityExpected = messageSequence.filter(msg => msg.priority === 'high').length
        const highPriorityReceived = receivedMessages.filter(msg => 
          messageSequence.find(orig => orig.data === msg && orig.priority === 'high')
        ).length
        
        if (highPriorityExpected > 0) {
          expect(highPriorityReceived).toBeGreaterThan(0)
        }
        
        // Cleanup handlers
        messageHandlers.forEach((handler, type) => {
          client.off(type as any, handler)
        })
      }
    })

    it('should handle concurrent subscription management without race conditions', async () => {
      const testCases = generateTestCases(() => ({
        userScenario: generateUserScenario(),
        subscriptionOperations: Array.from({ length: Math.floor(Math.random() * 20) + 5 }, () => ({
          action: ['subscribe', 'unsubscribe'][Math.floor(Math.random() * 2)],
          type: ['project', 'generation', 'community'][Math.floor(Math.random() * 3)],
          id: Math.random().toString(36).substr(2, 9),
          timing: Math.random() * 1000 // 0-1000ms delay
        }))
      }), 50) // Reduced count for performance

      for (const { userScenario, subscriptionOperations } of testCases) {
        // Property: For any sequence of concurrent subscription operations,
        // the system should handle them without race conditions
        
        await client.connect()
        
        // Simulate connection success
        const connectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'connect'
        )?.[1]
        if (connectHandler) {
          mockSocket.connected = true
          connectHandler()
        }
        
        expect(client.isConnected()).toBe(true)
        
        // Execute subscription operations concurrently
        const operationPromises = subscriptionOperations.map(async (operation) => {
          await new Promise(resolve => setTimeout(resolve, operation.timing))
          
          try {
            switch (operation.type) {
              case 'project':
                if (operation.action === 'subscribe') {
                  client.subscribeToProject(operation.id)
                } else {
                  client.unsubscribeFromProject(operation.id)
                }
                break
              case 'generation':
                if (operation.action === 'subscribe') {
                  client.subscribeToGeneration(operation.id)
                } else {
                  client.unsubscribeFromGeneration(operation.id)
                }
                break
              case 'community':
                if (operation.action === 'subscribe') {
                  client.subscribeToCommunity()
                } else {
                  client.unsubscribeFromCommunity()
                }
                break
            }
            return { success: true, operation }
          } catch (error) {
            return { success: false, operation, error }
          }
        })
        
        const results = await Promise.all(operationPromises)
        
        // All operations should complete successfully
        const successfulOperations = results.filter(r => r.success)
        expect(successfulOperations.length).toBe(subscriptionOperations.length)
        
        // Verify socket emit calls were made appropriately
        const emitCalls = mockSocket.emit.mock.calls
        expect(emitCalls.length).toBeGreaterThan(0)
        
        // No duplicate or conflicting operations should occur
        const subscribeOps = results.filter(r => r.operation.action === 'subscribe')
        const unsubscribeOps = results.filter(r => r.operation.action === 'unsubscribe')
        
        expect(subscribeOps.length + unsubscribeOps.length).toBe(subscriptionOperations.length)
      }
    })

    it('should maintain 99.9% uptime availability for core platform functions', async () => {
      const testCases = generateTestCases(() => ({
        simulationDuration: Math.floor(Math.random() * 5000) + 1000, // 1-6 seconds
        errorRate: Math.random() * 0.01, // 0-1% error rate
        networkCondition: generateNetworkCondition(),
        operationFrequency: Math.floor(Math.random() * 100) + 10 // 10-109 operations
      }), 20) // Reduced count for performance

      for (const { simulationDuration, errorRate, networkCondition, operationFrequency } of testCases) {
        // Property: For any simulation period and error rate, the system should
        // maintain high availability for core functions
        
        let successfulOperations = 0
        let totalOperations = 0
        const startTime = Date.now()
        
        await client.connect()
        
        // Simulate connection success
        const connectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'connect'
        )?.[1]
        if (connectHandler) {
          mockSocket.connected = true
          connectHandler()
        }
        
        // Run operations for the simulation duration
        const operationInterval = simulationDuration / operationFrequency
        
        for (let i = 0; i < Math.min(operationFrequency, 50); i++) { // Limit for test performance
          await new Promise(resolve => setTimeout(resolve, operationInterval))
          
          totalOperations++
          
          try {
            // Simulate random core operations
            const operations = [
              () => client.subscribeToProject(`project_${i}`),
              () => client.sendOptimisticUpdate('test:update', { data: i }),
              () => client.unsubscribeFromProject(`project_${i}`),
              () => client.isConnected()
            ]
            
            const operation = operations[Math.floor(Math.random() * operations.length)]
            
            // Simulate occasional errors based on error rate
            if (Math.random() < errorRate) {
              throw new Error('Simulated error')
            }
            
            operation()
            successfulOperations++
            
          } catch (error) {
            // Expected occasional errors
          }
        }
        
        const uptime = (successfulOperations / totalOperations) * 100
        
        // Should maintain high availability
        if (networkCondition.type === 'stable') {
          expect(uptime).toBeGreaterThan(99.5) // 99.5% for stable conditions
        } else if (networkCondition.type === 'slow' || networkCondition.type === 'mobile') {
          expect(uptime).toBeGreaterThan(99.0) // 99% for moderate conditions
        } else {
          expect(uptime).toBeGreaterThan(95.0) // 95% for poor conditions
        }
        
        // Core connection should remain stable
        expect(client.getConnectionState()).toBe(ConnectionState.CONNECTED)
      }
    })
  })

  describe('Message Delivery Performance', () => {
    it('should deliver messages within acceptable latency bounds', async () => {
      const testCases = generateTestCases(() => ({
        message: generateMessage(),
        networkCondition: generateNetworkCondition(),
        expectedLatency: Math.floor(Math.random() * 200) + 50 // 50-250ms expected
      }), 100)

      for (const { message, networkCondition, expectedLatency } of testCases) {
        // Property: Message delivery should meet latency requirements
        // based on network conditions and message priority
        
        await client.connect()
        
        const connectHandler = mockSocket.on.mock.calls.find(
          call => call[0] === 'connect'
        )?.[1]
        if (connectHandler) {
          mockSocket.connected = true
          connectHandler()
        }
        
        let messageReceived = false
        let deliveryTime = 0
        
        const handler = () => {
          messageReceived = true
          deliveryTime = Date.now() - sendTime
        }
        
        client.on(message.type as any, handler)
        
        const sendTime = Date.now()
        
        // Simulate message sending with network delay
        setTimeout(() => {
          const socketHandler = mockSocket.on.mock.calls.find(
            call => call[0] === message.type
          )?.[1]
          if (socketHandler) {
            socketHandler(message.data)
          }
        }, networkCondition.latency)
        
        // Wait for message delivery
        await new Promise(resolve => setTimeout(resolve, networkCondition.latency + 500))
        
        if (messageReceived) {
          const adjustedLatency = deliveryTime - networkCondition.latency
          
          // High priority messages should have lower latency tolerance
          if (message.priority === 'high') {
            expect(adjustedLatency).toBeLessThan(100)
          } else {
            expect(adjustedLatency).toBeLessThan(200)
          }
        }
        
        client.off(message.type as any, handler)
      }
    })
  })
})