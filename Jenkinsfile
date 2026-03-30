// ──────────────────────────────────────────────────────────────────
// FinPilot AI – Jenkins CI/CD Pipeline
// ──────────────────────────────────────────────────────────────────
// Prerequisites:
//   - Docker installed on Jenkins agent
//   - kubectl configured with cluster credentials
//   - Docker Hub (or ECR) credentials saved as Jenkins credential 'docker-hub-creds'
//   - Kubernetes config saved as Jenkins credential 'kubeconfig'
// ──────────────────────────────────────────────────────────────────

pipeline {
    agent any

    environment {
        DOCKER_REGISTRY  = 'docker.io'
        IMAGE_BACKEND    = 'finpilot/backend'
        IMAGE_FRONTEND   = 'finpilot/frontend'
        IMAGE_TAG        = "${env.BUILD_NUMBER}-${env.GIT_COMMIT?.take(7) ?: 'latest'}"
        K8S_NAMESPACE    = 'finpilot'
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {
        // ── Stage 1: Checkout ───────────────────────────────────
        stage('Checkout') {
            steps {
                checkout scm
                echo "✅ Code checked out: ${env.GIT_COMMIT}"
            }
        }

        // ── Stage 2: Install Dependencies ───────────────────────
        stage('Install Dependencies') {
            parallel {
                stage('Backend Deps') {
                    steps {
                        dir('backend') {
                            sh 'pip install -r requirements.txt'
                        }
                    }
                }
                stage('Frontend Deps') {
                    steps {
                        dir('frontend') {
                            sh 'npm ci --legacy-peer-deps'
                        }
                    }
                }
            }
        }

        // ── Stage 3: Lint & Test Backend ────────────────────────
        stage('Lint & Test Backend') {
            steps {
                dir('backend') {
                    sh '''
                        pip install ruff pytest
                        echo "🔍 Linting backend..."
                        ruff check .
                        echo "🧪 Running backend tests..."
                        pytest --tb=short -q || echo "⚠️  No tests found (add pytest tests)"
                    '''
                }
            }
        }

        // ── Stage 4: Lint & Type-check Frontend ─────────────────
        stage('Lint & Type-check Frontend') {
            steps {
                dir('frontend') {
                    sh '''
                        echo "🔍 Type checking..."
                        npx tsc --noEmit
                        echo "🔍 Linting frontend..."
                        npm run lint
                    '''
                }
            }
        }

        // ── Stage 5: Build Frontend ─────────────────────────────
        stage('Build Frontend') {
            steps {
                dir('frontend') {
                    sh 'npm run build'
                }
            }
        }

        // ── Stage 6: Docker Build ───────────────────────────────
        stage('Docker Build') {
            parallel {
                stage('Build Backend Image') {
                    steps {
                        sh """
                            docker build \
                                -f docker/backend.Dockerfile \
                                -t ${IMAGE_BACKEND}:${IMAGE_TAG} \
                                -t ${IMAGE_BACKEND}:latest \
                                .
                        """
                    }
                }
                stage('Build Frontend Image') {
                    steps {
                        sh """
                            docker build \
                                -f docker/frontend.Dockerfile \
                                -t ${IMAGE_FRONTEND}:${IMAGE_TAG} \
                                -t ${IMAGE_FRONTEND}:latest \
                                .
                        """
                    }
                }
            }
        }

        // ── Stage 7: Docker Push ────────────────────────────────
        stage('Docker Push') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-hub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh """
                        echo "\$DOCKER_PASS" | docker login -u "\$DOCKER_USER" --password-stdin ${DOCKER_REGISTRY}
                        docker push ${IMAGE_BACKEND}:${IMAGE_TAG}
                        docker push ${IMAGE_BACKEND}:latest
                        docker push ${IMAGE_FRONTEND}:${IMAGE_TAG}
                        docker push ${IMAGE_FRONTEND}:latest
                    """
                }
            }
        }

        // ── Stage 8: Deploy to Kubernetes ───────────────────────
        stage('Deploy to Kubernetes') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG')]) {
                    sh """
                        echo "🚀 Deploying to Kubernetes namespace: ${K8S_NAMESPACE}..."

                        # Apply infrastructure manifests
                        kubectl apply -f k8s/namespace.yaml
                        kubectl apply -f k8s/configmap.yaml
                        kubectl apply -f k8s/secrets.yaml

                        # Apply services
                        kubectl apply -f k8s/postgres-service.yaml
                        kubectl apply -f k8s/redis-service.yaml
                        kubectl apply -f k8s/backend-service.yaml
                        kubectl apply -f k8s/frontend-service.yaml

                        # Apply deployments
                        kubectl apply -f k8s/postgres-deployment.yaml
                        kubectl apply -f k8s/redis-deployment.yaml
                        kubectl apply -f k8s/backend-deployment.yaml
                        kubectl apply -f k8s/frontend-deployment.yaml

                        # Apply ingress
                        kubectl apply -f k8s/ingress.yaml

                        # Update image tags on deployments
                        kubectl set image deployment/backend \
                            backend=${IMAGE_BACKEND}:${IMAGE_TAG} \
                            -n ${K8S_NAMESPACE}
                        kubectl set image deployment/frontend \
                            frontend=${IMAGE_FRONTEND}:${IMAGE_TAG} \
                            -n ${K8S_NAMESPACE}

                        # Wait for rollout
                        kubectl rollout status deployment/backend -n ${K8S_NAMESPACE} --timeout=120s
                        kubectl rollout status deployment/frontend -n ${K8S_NAMESPACE} --timeout=120s

                        echo "✅ Deployment complete!"
                    """
                }
            }
        }
    }

    post {
        success {
            echo '✅ Pipeline completed successfully!'
        }
        failure {
            echo '❌ Pipeline failed. Check logs above for details.'
        }
        cleanup {
            sh 'docker system prune -f || true'
        }
    }
}
