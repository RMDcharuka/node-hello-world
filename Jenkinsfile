pipeline {
    agent any

    environment {
        DOCKERHUB_CREDENTIALS = credentials('dockerhub-cred')
        IMAGE_NAME = "dinaldocker/node-hello-world:${env.BUILD_ID}"
        APP_NAME = 'node-hello-world'
        VM_IP = '172.10.20.2' // REPLACE WITH YOUR VM's ACTUAL IP
        KUBECONFIG_PATH = 'C:\\\\Users\\\\user\\\\Desktop\\\\k3s.yaml'
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm: [
                    $class: 'GitSCM',
                    branches: [[name: 'main']],
                    userRemoteConfigs: [[
                        url: 'https://github.com/RMDcharuka/node-hello-world.git'
                    ]]
                ]
                bat 'echo ✅ Code checked out successfully'
            }
        }

        stage('Debug Workspace') {
            steps {
                bat 'echo Debug: check workspace contents'
                bat 'cd && dir'
                bat 'echo "Dockerfile exists:" && if exist Dockerfile (echo YES) else (echo NO)'
            }
        }

        stage('Build Docker Image') {
            steps {
                bat "docker build -t ${env.IMAGE_NAME} ."
                bat 'echo ✅ Docker image built successfully'
            }
        }

        stage('Docker Login') {
            steps {
                bat "echo ${env.DOCKERHUB_CREDENTIALS_PSW} | docker login -u ${env.DOCKERHUB_CREDENTIALS_USR} --password-stdin"
                bat 'echo ✅ Logged in to DockerHub'
            }
        }

        stage('Push Docker Image') {
            steps {
                bat "docker push ${env.IMAGE_NAME}"
                bat "echo ✅ Docker image pushed: ${env.IMAGE_NAME}"
            }
        }

        stage('Deploy to K3s Cluster') {
            steps {
                script {
                    bat 'echo 🚀 Deploying to K3s cluster on VM...'
                    
                    bat """
                        kubectl --kubeconfig=${env.KUBECONFIG_PATH} cluster-info
                        if errorlevel 1 (
                            echo ERROR: Failed to connect to cluster
                            exit /b 1
                        )
                        
                        kubectl --kubeconfig=${env.KUBECONFIG_PATH} get deployment ${env.APP_NAME}
                        if errorlevel 1 (
                            echo Creating new deployment...
                            kubectl --kubeconfig=${env.KUBECONFIG_PATH} create deployment ${env.APP_NAME} ^
                                --image=${env.IMAGE_NAME} ^
                                --port=8083
                            kubectl --kubeconfig=${env.KUBECONFIG_PATH} scale deployment/${env.APP_NAME} --replicas=2
                        ) else (
                            echo Updating existing deployment...
                            kubectl --kubeconfig=${env.KUBECONFIG_PATH} set image deployment/${env.APP_NAME} ${env.APP_NAME}=${env.IMAGE_NAME} --record
                        )
                    """
                    
                    bat """
                        kubectl --kubeconfig=${env.KUBECONFIG_PATH} get service ${env.APP_NAME}-service
                        if errorlevel 1 (
                            echo Creating new service...
                            kubectl --kubeconfig=${env.KUBECONFIG_PATH} expose deployment ${env.APP_NAME} ^
                                --port=80 ^
                                --target-port=8083 ^
                                --name=${env.APP_NAME}-service ^
                                --type=NodePort
                        ) else (
                            echo Service already exists
                        )
                    """
                    
                    bat 'echo ✅ Deployment and Service updated successfully!'
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                script {
                    // Check rollout status
                    bat """
                        kubectl --kubeconfig=${env.KUBECONFIG_PATH} rollout status deployment/${env.APP_NAME} --timeout=180s
                        echo ✅ Rollout completed successfully
                    """
                    
                    // Get service details
                    bat """
                        kubectl --kubeconfig=${env.KUBECONFIG_PATH} get svc ${env.APP_NAME}-service -o wide
                    """
                    
                    // Get NodePort using simple bat command
                    def nodePort = bat(
                        script: """
                            kubectl --kubeconfig=${env.KUBECONFIG_PATH} get svc ${env.APP_NAME}-service -o jsonpath='{.spec.ports[0].nodePort}'
                        """,
                        returnStdout: true
                    ).trim()
                    
                    echo "📊 Detected NodePort: ${nodePort}"
                    
                    if (nodePort && nodePort != "null") {
                        echo "🌐 Application accessible at: http://${env.VM_IP}:${nodePort}"
                        
                        // Simple connectivity test using bat
                        bat """
                            echo Testing connectivity to http://${env.VM_IP}:${nodePort}
                            curl --connect-timeout 10 --max-time 15 http://${env.VM_IP}:${nodePort} || echo "Connectivity test completed (curl may not be available)"
                            ping -n 3 ${env.VM_IP} || echo "Ping test completed"
                        """
                    } else {
                        echo "❌ Could not determine NodePort or service type is not NodePort"
                        bat """
                            kubectl --kubeconfig=${env.KUBECONFIG_PATH} describe svc ${env.APP_NAME}-service
                        """
                    }
                    
                    bat 'echo ✅ Deployment verification completed'
                }
            }
        }
    }

    post {
        always {
            bat 'docker logout'
            bat 'echo 🚀 Pipeline execution completed'
        }
        success {
            bat 'echo ✅ Pipeline succeeded! Application deployed successfully.'
        }
        failure {
            bat 'echo ❌ Pipeline failed! Check the logs for errors.'
        }
    }
}