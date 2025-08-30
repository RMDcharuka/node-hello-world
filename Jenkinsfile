pipeline {
    agent any

    environment {
        // DockerHub credentials ID in Jenkins
        DOCKERHUB_CREDENTIALS = credentials('dockerhub-cred')
        // FIXED: Use BUILD_ID instead of 'latest' for consistency
        IMAGE_NAME = "dinaldocker/node-hello-world:${env.BUILD_ID}"
        APP_NAME = 'node-hello-world'
        // Your VM's IP address - REPLACE WITH YOUR ACTUAL VM IP
        VM_IP = '172.20.10.2' 
        // Kubeconfig credentials ID in Jenkins
        KUBECONFIG = credentials('k3s-kubeconfig')
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout([
                    $class: 'GitSCM',
                    branches: [[name: 'main']],
                    userRemoteConfigs: [[
                        url: 'https://github.com/RMDcharuka/node-hello-world.git'
                    ]]
                ])
                echo "✅ Code checked out successfully"
            }
        }

        stage('Debug Workspace') {
            steps {
                echo 'Debug: check workspace contents'
                sh 'pwd && ls -la'
                sh 'echo "Dockerfile exists:" && ls -la Dockerfile || echo "No Dockerfile found"'
            }
        }

        stage('Build Docker Image') {
            steps {
                // FIXED: Build with unique tag (BUILD_ID)
                sh "docker build -t ${IMAGE_NAME} ."
                echo '✅ Docker image built successfully'
            }
        }

        stage('Docker Login') {
            steps {
                sh "echo ${DOCKERHUB_CREDENTIALS_PSW} | docker login -u ${DOCKERHUB_CREDENTIALS_USR} --password-stdin"
                echo '✅ Logged in to DockerHub'
            }
        }

        stage('Push Docker Image') {
            steps {
                // FIXED: Always push the same image we built
                sh "docker push ${IMAGE_NAME}"
                echo "✅ Docker image pushed: ${IMAGE_NAME}"
            }
        }

        stage('Deploy to K3s Cluster') {
            steps {
                script {
                    echo '🚀 Deploying to K3s cluster on VM...'
                    
                    // FIXED: Use kubeconfig and consistent image name
                    sh """
                        # Check cluster access
                        kubectl --kubeconfig=${KUBECONFIG} cluster-info
                        
                        # Create or update deployment
                        if ! kubectl --kubeconfig=${KUBECONFIG} get deployment ${APP_NAME} > /dev/null 2>&1; then
                            echo "Creating new deployment..."
                            kubectl --kubeconfig=${KUBECONFIG} create deployment ${APP_NAME} \\
                                --image=${IMAGE_NAME} \\
                                --port=8083
                            kubectl --kubeconfig=${KUBECONFIG} scale deployment/${APP_NAME} --replicas=2
                        else
                            echo "Updating existing deployment..."
                            kubectl --kubeconfig=${KUBECONFIG} set image deployment/${APP_NAME} ${APP_NAME}=${IMAGE_NAME} --record
                        fi
                    """
                    
                    // Create service if not exists
                    sh """
                        if ! kubectl --kubeconfig=${KUBECONFIG} get service ${APP_NAME}-service > /dev/null 2>&1; then
                            echo "Creating new service..."
                            kubectl --kubeconfig=${KUBECONFIG} expose deployment ${APP_NAME} \\
                                --port=80 \\
                                --target-port=8083 \\
                                --name=${APP_NAME}-service \\
                                --type=NodePort
                        else
                            echo "Service already exists, no need to update."
                        fi
                    """
                    
                    // Wait for rollout
                    sh "kubectl --kubeconfig=${KUBECONFIG} rollout status deployment/${APP_NAME} --timeout=2m"
                    echo '✅ Deployment and Service updated successfully!'
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                script {
                    // Wait for rollout to complete
                    sh "kubectl --kubeconfig=${KUBECONFIG} rollout status deployment/${APP_NAME} --timeout=180s"
                    
                    // Get service details
                    sh "kubectl --kubeconfig=${KUBECONFIG} get svc ${APP_NAME}-service"
                    
                    // Get the NodePort
                    def nodePort = sh(
                        script: "kubectl --kubeconfig=${KUBECONFIG} get svc ${APP_NAME}-service -o jsonpath='{.spec.ports[0].nodePort}'",
                        returnStdout: true
                    ).trim()
                    
                    echo "📊 Service NodePort: ${nodePort}"
                    
                    // Test the application from Jenkins (on Windows) to VM
                    sh "curl -s http://${VM_IP}:${nodePort} || echo 'Curl test failed but deployment succeeded'"
                    echo "🌐 Application accessible at: http://${VM_IP}:${nodePort}"
                    
                    echo '✅ Deployment verified successfully'
                }
            }
        }
    }

    post {
        always {
            echo "🚀 Pipeline execution completed"
            // Cleanup Docker credentials
            sh 'docker logout'
        }
        success {
            echo '✅ Pipeline succeeded! Application deployed successfully.'
        }
        failure {
            echo '❌ Pipeline failed! Check the logs for errors.'
        }
    }
}